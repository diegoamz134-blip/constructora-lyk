// src/utils/imageCropper.js

export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // Clave para evitar CORS
    image.src = url;
  });

export function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Nueva versión robusta que evita imágenes negras usando doble canvas
 */
export default async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // 1. Configurar dimensiones del canvas "base" para permitir rotación sin cortar
  canvas.width = safeArea;
  canvas.height = safeArea;

  // 2. Rotar el contexto alrededor del centro
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // 3. Dibujar la imagen original centrada en el canvas base
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  // 4. Crear un SEGUNDO canvas solo para el recorte final
  // Esto evita el problema de 'putImageData' y las imágenes negras
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = pixelCrop.width;
  finalCanvas.height = pixelCrop.height;
  const finalCtx = finalCanvas.getContext('2d');

  // 5. Copiar SOLO el pedazo que queremos del canvas base al final
  // pixelCrop.x y pixelCrop.y son las coordenadas relativas al centro del canvas rotado
  // Necesitamos ajustarlas relativas al "safeArea"
  finalCtx.drawImage(
    canvas,
    safeArea / 2 - image.width * 0.5 + pixelCrop.x,
    safeArea / 2 - image.height * 0.5 + pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // 6. Generar el archivo JPG comprimido
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (file) => {
        if (file) resolve(file);
        else reject(new Error('Error al generar el archivo de imagen.'));
      },
      'image/jpeg',
      0.8 // Calidad 80%
    );
  });
}