import Image from 'next/image';
import { photos } from '../../lib/photos';

export default function Gallery() {
  return (
    <ul>
      {photos.map((photo) => (
        <li key={photo.id}>
          <Image src={photo.src} alt={photo.title} width={320} height={200} />
          <span>{photo.title}</span>
        </li>
      ))}
    </ul>
  );
}
