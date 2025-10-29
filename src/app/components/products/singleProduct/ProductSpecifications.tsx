import { FC } from "react";

interface ProductSpecificationsProps {
  specs: { label: string; value: string }[];
}

const ProductSpecifications: FC<ProductSpecificationsProps> = ({ specs }) => {
  return (
    <div>
      <h2 className="font-semibold text-xl mb-3 text-foreground">Specifications</h2>
      <dl className="divide-y divide-border">
        {specs.map((s, i) => (
          <div key={i} className="flex justify-between py-2">
            <dt className="font-medium text-muted-foreground">{s.label}</dt>
            <dd className="text-foreground">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default ProductSpecifications;