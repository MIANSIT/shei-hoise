// mergeMultipleRefs.ts
export default function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.Ref<T> {
  return (value: T) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") ref(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    });
  };
}
