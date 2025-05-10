import PricingTable from "@/components/pricing-table"
import { Button } from "@/components/ui/button"
import { ExternalLink, Github } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-center sm:text-left md:text-3xl">
              OpenRouter Model Price Comparison
            </h1>
            <p className="text-center sm:text-left text-muted-foreground">
              Compare pricing across different AI models available on OpenRouter
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="https://github.com/famasya/v0-openrouter-models"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size={"sm"} className="bg-blue-600 hover:bg-blue-700">
                <Github className="h-4 w-4" />
                <span>View on GitHub</span>
              </Button>
            </a>
            <a
              href="https://structured-outputs-playground.pages.dev/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size={"sm"} className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="h-4 w-4" />
                Structured Outputs Playground
              </Button>
            </a>
          </div>
        </div>
        <PricingTable />
      </div>
    </main>
  )
}
