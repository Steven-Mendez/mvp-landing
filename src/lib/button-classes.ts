import type { VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Variant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>
type Size = NonNullable<VariantProps<typeof buttonVariants>["size"]>

/**
 * The attributes `<Button asChild>` puts on a link, for static `.astro` markup that
 * must look exactly like the React button without shipping it.
 */
export function buttonLink({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: Variant
  size?: Size
  className?: string
} = {}) {
  return {
    "data-slot": "button",
    "data-variant": variant,
    "data-size": size,
    class: cn(buttonVariants({ variant, size, className })),
  }
}

/** `MarketingButton` from ui-web/custom: a comfortable call to action for public pages. */
export function marketingButtonLink(variant: Variant, className?: string) {
  return buttonLink({
    variant,
    size: "lg",
    className: cn(
      "h-12 gap-3 rounded-full px-6 motion-reduce:transition-none",
      className
    ),
  })
}
