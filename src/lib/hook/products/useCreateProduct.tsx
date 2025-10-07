import { createProduct } from "@/lib/query/products/createProducts";
import { ProductType } from "@/lib/schema/productSchema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProductType) => {
      return createProduct(payload);
    },
    onSuccess: (data) => {
      console.log("Product created:", data.productId);

      // Invalidate related queries to refetch updated products list
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => {
      console.error("Failed to create product:", err);
    },
  });
}
