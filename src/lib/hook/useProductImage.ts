import { useState } from "react";
import { useSwipeable, SwipeableHandlers } from "react-swipeable";

interface UseProductImageProps {
  images: string[];
}

export const useProductImage = ({ images }: UseProductImageProps) => {
  const [mainIndex, setMainIndex] = useState(0);

  const handlePrev = () => setMainIndex(prev => (prev > 0 ? prev - 1 : prev));
  const handleNext = () => setMainIndex(prev => (prev < images.length - 1 ? prev + 1 : prev));
  const handleThumbnailClick = (idx: number) => idx !== mainIndex && setMainIndex(idx);

  const swipeHandlers: SwipeableHandlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrev,
    trackMouse: true,
  });

  return { mainIndex, handleThumbnailClick, swipeHandlers };
};
