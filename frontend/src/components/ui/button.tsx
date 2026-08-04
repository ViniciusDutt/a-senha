import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "group/button cursor-pointer relative inline-flex shrink-0 cursor-pointer",
    "border-0 bg-transparent p-0",
    "font-medium whitespace-nowrap select-none",
    "outline-offset-4",
    "transition-[filter] duration-[250ms]",
    "hover:brightness-110",
    "focus-visible:outline-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "[&_svg]:pointer-events-none",
    "[&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      size: {
        default: "text-sm",
        xs: "text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "text-sm",
        lg: "text-base",

        icon: "",
        "icon-xs": "[&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "",
        "icon-lg": "",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const frontVariants = cva(
  [
    "relative z-10 inline-flex w-full items-center justify-center",
    "rounded-[12px]",
    "will-change-transform",
    "-translate-y-1",
    "transition-transform duration-[600ms]",
    "[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1)]",

    "group-hover/button:-translate-y-1.5",
    "group-hover/button:duration-[250ms]",
    "group-hover/button:[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1.5)]",

    "group-active/button:-translate-y-0.5",
    "group-active/button:duration-[34ms]",

    "group-disabled/button:translate-y-0",

    "[&_svg]:pointer-events-none",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: ["bg-primary", "text-white"],

        outline: [
          "border border-chart-1",
          "bg-chart-1",
          "text-[#6d4500]",
          "group-hover/button:bg-chart-1",
        ],

        ghost: ["bg-none", "text-foreground", "group-hover/button:bg-black/10"],
      },

      size: {
        default:
          "h-9 font-bold text-lg gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",

        xs: "h-6 text-xs font-bold gap-1 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",

        sm: "h-8 text-sm font-bold gap-1 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",

        lg: "h-12 text-xl font-bold gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",

        icon: "size-9",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const edgeVariants = cva(["absolute inset-0 rounded-[12px]"], {
  variants: {
    variant: {
      default: [
        "bg-[linear-gradient(to_left,hsl(340deg_100%_16%)_0%,hsl(340deg_100%_32%)_8%,hsl(340deg_100%_32%)_92%,hsl(340deg_100%_16%)_100%)]",
      ],

      outline: [
        "bg-[linear-gradient(to_left,hsl(340deg_100%_16%)_0%,#9c6c00_8%,#cd960e_92%,#9c6c00_100%)]",
      ],

      ghost: ["bg-none"],
    },
  },

  defaultVariants: {
    variant: "default",
  },
});

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> &
  VariantProps<typeof frontVariants>;

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ size }), className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-[12px]",
          variant !== "ghost" && "bg-black/25",
          "translate-y-0.5",
          "will-change-transform",
          "transition-transform duration-600",
          "ease-[cubic-bezier(0.3,0.7,0.4,1)]",

          "group-hover/button:translate-y-1",
          "group-hover/button:duration-250",
          "group-hover/button:ease-[cubic-bezier(0.3,0.7,0.4,1.5)]",

          "group-active/button:translate-y-px",
          "group-active/button:duration-34",

          "group-disabled/button:translate-y-0",
        )}
      />
      <span aria-hidden="true" className={edgeVariants({ variant })} />
      <span className={frontVariants({ variant, size })}>{children}</span>
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
