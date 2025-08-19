import { FC } from "react";

interface ProductFeaturesProps {
  features: string[];
}

const ProductFeatures: FC<ProductFeaturesProps> = ({ features }) => {
  return (
    <div>
      <h2 className="font-semibold text-xl mb-3">Features</h2>
      <ul className="list-disc list-inside text-gray-700 space-y-2">
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </div>
  );
};

export default ProductFeatures;
