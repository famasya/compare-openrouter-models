import PricingTable from "@/components/pricing-table"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold text-center md:text-3xl">AI Model Pricing Comparison</h1>
        <p className="text-center text-muted-foreground">
          Compare pricing across different AI models available on OpenRouter
        </p>
        <PricingTable />
      </div>
    </main>
  )
}
