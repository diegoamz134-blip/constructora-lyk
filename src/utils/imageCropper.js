// src/utils/imageCropper.js

export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // Necesario para evitar problemas de CORS
    image.src = url;
  });

export function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Esta función hace la magia: toma la imagen y el área de recorte,
 * y devuelve un 'Blob' (un archivo en memoria) comprimido y cuadrado.
 */
export default async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // Configurar el canvas al tamaño seguro para la rotación
  canvas.width = safeArea;
  canvas.height = safeArea;

  // Trasladar el contexto al centro y rotar
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // Dibujar la imagen rotada en el centro
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  // Redimensionar el canvas al tamaño final del recorte
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Pegar los datos de la imagen rotada en la posición correcta
  ctx.putImageData(
    data,
    Math.round(0 - pixelCrop.x),
    Math.round(0 - pixelCrop.y)
  );

  // --- AQUÍ OCURRE LA COMPRESIÓN ---
  // Convertimos el canvas a un Blob JPG con calidad 0.7 (70%)
  // Esto reduce drásticamente el peso del archivo.
  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, 'image/jpeg', 0.7); 
  });
}