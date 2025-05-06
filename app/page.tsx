import PricingTable from "@/components/pricing-table"
import { Github } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-center sm:text-left md:text-3xl">
              OpenRouter Model Price Comparison
            </h1>
            <p className="text-center sm:text-left text-muted-foreground">
              Compare pricing across different AI models available on OpenRouter
            </p>
          </div>
          <a
            href="https://github.com/famasya/v0-openrouter-models"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 sm:mt-0 inline-flex items-center gap-2 text-sm hover:text-primary hover:underline"
          >
            <Github className="h-4 w-4" />
            <span>View on GitHub</span>
          </a>
        </div>
        <PricingTable />
      </div>
    </main>
  )
}
