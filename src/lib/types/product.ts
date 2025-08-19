export interface Product {
  imageUrl: string;
  id: number;
  title: string;
  category: string;
  currentPrice: number;
  originalPrice: number;
  rating: number;
  images: string[]; // Change from imageUrl to images
  discount: number;
}