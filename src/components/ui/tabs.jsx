import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const tabsListVariants = cva(
    "inline-flex items-center text-muted-foreground",
    {
        variants: {
            variant: {
                default: "h-9 justify-center rounded-lg bg-muted p-1",
                line: "h-auto gap-4 border-b border-border bg-transparent p-0",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

const tabsTriggerVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default:
                    "rounded-md px-3 py-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
                line: "relative pb-3 text-muted-foreground data-[state=active]:text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:after:bg-primary",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

const TabsListContext = React.createContext({ variant: "default" })

const TabsList = React.forwardRef(
    ({ className, variant = "default", ...props }, ref) => (
        <TabsListContext.Provider value={{ variant }}>
            <TabsPrimitive.List
                ref={ref}
                className={cn(tabsListVariants({ variant }), className)}
                {...props}
            />
        </TabsListContext.Provider>
    )
)
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(
    ({ className, ...props }, ref) => {
        const { variant } = React.useContext(TabsListContext)
        return (
            <TabsPrimitive.Trigger
                ref={ref}
                className={cn(tabsTriggerVariants({ variant }), className)}
                {...props}
            />
        )
    }
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(
    ({ className, ...props }, ref) => (
        <TabsPrimitive.Content
            ref={ref}
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
            {...props}
        />
    )
)
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
