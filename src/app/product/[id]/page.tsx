"use client";

import ProductImage from "../../components/singleProduct/ProductImage";
import ProductTitle from "../../components/singleProduct/ProductTitle";
import ProductPrice from "../../components/singleProduct/ProductPrice";
import ProductQuantitySelector from "../../components/singleProduct/ProductQuantitySelector";
import AddToCartButton from "../../components/singleProduct/AddToCartButton";
import ProductFeatures from "../../components/singleProduct/ProductFeatures";
import ProductSpecifications from "../../components/singleProduct/ProductSpecifications";
import BackButton from "@/app/components/singleProduct/BackButton";

export default function ProductPage() {
  const product = {
    id: 1,
    name: "Premium Wireless Headphones",
    category: "Audio",
    rating: 4.5,
    price: 199.99,
    originalPrice: 249.99,
    discount: 20,
    description:
      "Experience crystal-clear sound with our premium wireless headphones. Featuring active noise cancellation, 30-hour battery life, and comfortable over-ear design for all-day listening comfort.",
    image: "/images/headphone.jpg",
    features: [
      "Active noise cancellation",
      "30-hour battery life",
      "Bluetooth 5.2 connectivity",
      "Comfortable memory foam ear cushions",
      "Quick charge - 5 minutes for 4 hours of playback",
      "Built-in microphone for calls",
    ],
    specifications: [
      { label: "Battery Life", value: "30 hours" },
      { label: "Brand", value: "AudioMax" },
      { label: "Connectivity", value: "Bluetooth 5.2, 3.5mm jack" },
      { label: "Model", value: "WH-1000XM5" },
      { label: "Warranty", value: "2 years" },
      { label: "Weight", value: "250g" },
    ],
  };

  const handleAddToCart = async (): Promise<void> => {
    console.log("Added to cart:", product.id);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Back button */}
      <BackButton href="/shop" label="Back to Products" />

      {/* Top Section: Image + Details */}
      <div className="grid lg:grid-cols-2 gap-10 mt-6">
        {/* Left: Image */}
        <ProductImage
          src={product.image}
          alt={product.name}
          discount={product.discount}
        />

        {/* Right: Details */}
        <div className="flex flex-col">
          <ProductTitle
            name={product.name}
            category={product.category}
            rating={product.rating}
          />

          <ProductPrice
            price={product.price}
            originalPrice={product.originalPrice}
          />

          <p className="text-gray-600 mt-4">{product.description}</p>

          <div className="flex items-center gap-4 mt-6">
            <ProductQuantitySelector />
            <AddToCartButton onAdd={handleAddToCart} />
          </div>
        </div>
      </div>
      <hr className="my-10 border-gray-300" />
      {/* Bottom Section: Features + Specifications */}
      <div className="grid sm:grid-cols-2 gap-8 mt-10">
        <ProductFeatures features={product.features} />
        <ProductSpecifications specs={product.specifications} />
      </div>
    </div>
  );
}
