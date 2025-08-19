import { FC } from "react";

interface ProductSpecificationsProps {
  specs: { label: string; value: string }[];
}

const ProductSpecifications: FC<ProductSpecificationsProps> = ({ specs }) => {
  return (
    <div>
      <h2 className="font-semibold text-xl mb-3">Specifications</h2>
      <dl className="divide-y divide-gray-200">
        {specs.map((s, i) => (
          <div key={i} className="flex justify-between py-2 text-gray-700">
            <dt className="font-medium">{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default ProductSpecifications;
