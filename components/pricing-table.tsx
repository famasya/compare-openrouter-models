"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  ExternalLink,
  RefreshCw,
  Plus,
  Github,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useMobile } from "@/hooks/use-mobile"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useDebounce } from "@/hooks/use-debounce"

// OpenRouter API response types
interface OpenRouterModel {
  id: string
  name: string
  created: number
  description: string
  context_length: number
  architecture: {
    modality: string
    input_modalities: string[]
    output_modalities: string[]
    tokenizer: string
    instruct_type?: string
  }
  pricing: {
    prompt: string
    completion: string
    request?: string
    image?: string
    web_search?: string
    internal_reasoning?: string
    input_cache_read?: string
    input_cache_write?: string
  }
  top_provider: {
    context_length?: number
    max_completion_tokens?: number
    is_moderated: boolean
  }
  per_request_limits: any
  supported_parameters: string[]
}

interface OpenRouterResponse {
  data: OpenRouterModel[]
}

// Our model data structure
interface ModelData {
  id: string
  name: string
  url: string
  provider: string
  contextWindow: string
  inputCost: string
  outputCost: string
  features: string[]
  keep: boolean
  description: string
  modalities: string[]
}

// Column configuration - Removed rate limit column
const columns = [
  { id: "keep", label: "Keep", always: true },
  { id: "name", label: "Model", always: true },
  { id: "provider", label: "Provider", always: true },
  { id: "contextWindow", label: "Context", always: false },
  { id: "inputCost", label: "Input Cost", always: true },
  { id: "outputCost", label: "Output Cost", always: true },
  { id: "features", label: "Features", always: false },
]

// Number of models to load initially and with each "Load More" click
const MODELS_PER_PAGE = 10

export default function PricingTable() {
  const [modelData, setModelData] = useState<ModelData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300) // 300ms debounce delay
  const [visibleColumns, setVisibleColumns] = useState(columns.filter((col) => col.always).map((col) => col.id))
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  }>({ key: "inputCost", direction: "ascending" }) // Default sort by input cost
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [displayLimit, setDisplayLimit] = useState(MODELS_PER_PAGE)

  const isMobile = useMobile()

  // Fetch data from OpenRouter API
  const fetchModels = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("https://openrouter.ai/api/v1/models")

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
      }

      const data: OpenRouterResponse = await response.json()

      // Transform API data to our model structure
      const transformedData: ModelData[] = data.data.map((model) => {
        // Extract provider from model ID (e.g., "openai/gpt-4o" -> "OpenAI")
        const providerFromId = model.id.split("/")[0]
        const provider = capitalizeFirstLetter(providerFromId)

        // Format context window size
        const contextWindow = formatContextSize(model.context_length)

        // Extract features from model data
        const features = extractFeatures(model)

        return {
          id: model.id,
          name: model.name,
          url: `https://openrouter.ai/models/${model.id}`,
          provider,
          contextWindow,
          inputCost: formatPrice(model.pricing.prompt),
          outputCost: formatPrice(model.pricing.completion),
          features,
          keep: false,
          description: model.description,
          modalities: model.architecture.input_modalities,
        }
      })

      setModelData(transformedData)
      setLastUpdated(new Date())
      // Reset display limit when fetching new data
      setDisplayLimit(MODELS_PER_PAGE)
    } catch (err) {
      console.error("Error fetching models:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch models")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper functions
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  const formatContextSize = (size: number) => {
    if (size >= 1000000) {
      return `${size / 1000000}M`
    } else if (size >= 1000) {
      return `${size / 1000}K`
    } else {
      return size.toString()
    }
  }

  const formatPrice = (price: string) => {
    // Price is in dollars per token, convert to dollars per 1K tokens
    const pricePerToken = Number.parseFloat(price)
    const pricePerThousandTokens = pricePerToken * 1000
    return `$${pricePerThousandTokens.toFixed(pricePerThousandTokens < 0.001 ? 6 : pricePerThousandTokens < 0.01 ? 5 : 4)}`
  }

  const extractFeatures = (model: OpenRouterModel) => {
    const features: string[] = []

    // Check for vision capability
    if (model.architecture.input_modalities.includes("image")) {
      features.push("Vision")
    }

    // Check for function calling
    if (model.supported_parameters.includes("tools") || model.supported_parameters.includes("function_call")) {
      features.push("Function calling")
    }

    // Check for long context
    if (model.context_length >= 100000) {
      features.push("Long context")
    }

    // Add modality information
    if (model.architecture.modality === "multimodal") {
      features.push("Multimodal")
    }

    return features
  }

  // Fetch models on component mount
  useEffect(() => {
    fetchModels()
  }, [])

  // Update visible columns based on screen size when component mounts (client-side only)
  useEffect(() => {
    // This only runs in the browser, after the component mounts
    setVisibleColumns(columns.filter((col) => col.always || window.innerWidth >= 768).map((col) => col.id))
  }, [])

  // Reset display limit when search query or filters change
  useEffect(() => {
    setDisplayLimit(MODELS_PER_PAGE)
  }, [debouncedSearchQuery, activeFilters])

  // Toggle keep status for a model
  const toggleKeep = (id: string) => {
    setModelData((prev) => prev.map((model) => (model.id === id ? { ...model, keep: !model.keep } : model)))
  }

  // Filter models based on search query and keep status
  const filteredModels = modelData.filter((model) => {
    // Always show models marked as "keep"
    if (model.keep) return true

    const searchLower = debouncedSearchQuery.toLowerCase()
    const matchesSearch =
      model.name.toLowerCase().includes(searchLower) ||
      model.provider.toLowerCase().includes(searchLower) ||
      model.features.some((feature) => feature.toLowerCase().includes(searchLower))

    // Check if model matches active provider filters
    const matchesProviderFilter = activeFilters.length === 0 || activeFilters.includes(model.provider)

    return matchesSearch && matchesProviderFilter
  })

  // Sort models based on sort configuration
  const sortedModels = [...filteredModels].sort((a, b) => {
    // First, prioritize kept models
    if (a.keep && !b.keep) return -1
    if (!a.keep && b.keep) return 1

    // If both are kept or both are not kept, sort by the configured sort
    if (sortConfig) {
      if (sortConfig.key === "keep") {
        return sortConfig.direction === "ascending" ? Number(a.keep) - Number(b.keep) : Number(b.keep) - Number(a.keep)
      }

      const aValue = a[sortConfig.key as keyof typeof a]
      const bValue = b[sortConfig.key as keyof typeof b]

      if (sortConfig.key === "inputCost" || sortConfig.key === "outputCost") {
        // Remove $ and convert to number for price sorting
        const aNum = Number.parseFloat(String(aValue).replace("$", ""))
        const bNum = Number.parseFloat(String(bValue).replace("$", ""))
        return sortConfig.direction === "ascending" ? aNum - bNum : bNum - aNum
      }

      if (sortConfig.key === "contextWindow") {
        // Convert context window sizes to numbers for sorting (e.g., "128K" -> 128000)
        const aSize = parseContextSize(String(aValue))
        const bSize = parseContextSize(String(bValue))
        return sortConfig.direction === "ascending" ? aSize - bSize : bSize - aSize
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "ascending" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }
    }

    return 0
  })

  // Get models to display with pagination
  const displayedModels = sortedModels.slice(0, displayLimit)
  const hasMoreModels = sortedModels.length > displayLimit

  // Load more models
  const loadMoreModels = () => {
    setDisplayLimit((prev) => prev + MODELS_PER_PAGE)
  }

  // Get unique providers for filtering
  const providers = Array.from(new Set(modelData.map((model) => model.provider)))

  // Toggle provider filter
  const toggleProviderFilter = (provider: string) => {
    setActiveFilters((prev) => (prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]))
  }

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters([])
    setSearchQuery("")
  }

  // Helper function to parse context window sizes
  function parseContextSize(sizeStr: string): number {
    const match = sizeStr.match(/(\d+)([KM])?/)
    if (!match) return 0

    const [, num, unit] = match
    const baseNum = Number.parseInt(num, 10)

    if (unit === "K") return baseNum * 1000
    if (unit === "M") return baseNum * 1000000
    return baseNum
  }

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setVisibleColumns((prev) => (prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]))
  }

  // Handle sorting
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Render sort indicator
  const renderSortIndicator = (columnId: string) => {
    if (sortConfig?.key !== columnId) return null
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4 inline" />
    )
  }

  // Render model name with link - Updated for consistent icon positioning
  const renderModelName = (model: ModelData, isCard = false) => {
    return (
      <div className={`flex items-center gap-1 ${isCard ? "font-medium text-base" : "font-medium"}`}>
        <a
          href={model.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-primary hover:underline inline-flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {model.name}
        </a>
        <ExternalLink className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
      </div>
    )
  }

  // Render loading skeletons
  const renderSkeletons = () => {
    return Array.from({ length: 10 }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchModels} disabled={isLoading} title="Refresh data">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" disabled={isLoading}>
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Providers {activeFilters.length > 0 && `(${activeFilters.length})`}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white overflow-y-scroll h-96">
              {providers.map((provider) => (
                <DropdownMenuCheckboxItem
                  key={provider}
                  checked={activeFilters.includes(provider)}
                  onCheckedChange={() => toggleProviderFilter(provider)}
                >
                  {provider}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" disabled={isLoading}>
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                  disabled={column.always}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {(activeFilters.length > 0 || searchQuery) && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters" disabled={isLoading}>
              <X className="h-4 w-4" />
            </Button>
          )}

          <a
            href="https://github.com/famasya/v0-openrouter-models"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <Button variant="outline" size="icon" title="View on GitHub">
              <Github className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 mb-2">
        <Button
          variant={sortConfig.key === "inputCost" ? "default" : "outline"}
          size="sm"
          onClick={() => requestSort("inputCost")}
          className="text-xs"
          disabled={isLoading}
        >
          Sort by Input Cost {sortConfig.key === "inputCost" && renderSortIndicator("inputCost")}
        </Button>
        <Button
          variant={sortConfig.key === "outputCost" ? "default" : "outline"}
          size="sm"
          onClick={() => requestSort("outputCost")}
          className="text-xs"
          disabled={isLoading}
        >
          Sort by Output Cost {sortConfig.key === "outputCost" && renderSortIndicator("outputCost")}
        </Button>
        <Button
          variant={sortConfig.key === "contextWindow" ? "default" : "outline"}
          size="sm"
          onClick={() => requestSort("contextWindow")}
          className="text-xs"
          disabled={isLoading}
        >
          Sort by Context Size {sortConfig.key === "contextWindow" && renderSortIndicator("contextWindow")}
        </Button>
      </div>

      {isLoading ? (
        // Loading state
        <div className="space-y-4">
          {isMobile ? (
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map(
                        (column) =>
                          visibleColumns.includes(column.id) && (
                            <TableHead key={column.id}>
                              <div className="flex items-center">{column.label}</div>
                            </TableHead>
                          ),
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 10 }).map((_, index) => (
                      <TableRow key={index}>
                        {visibleColumns.map((column) => (
                          <TableCell key={column}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      ) : isMobile ? (
        // Mobile card view
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {displayedModels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No models found matching your search</div>
            ) : (
              displayedModels.map((model) => (
                <Card key={model.id} className={`p-4 ${model.keep ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`keep-mobile-${model.id}`}
                        checked={model.keep}
                        onCheckedChange={() => toggleKeep(model.id)}
                      />
                      <div>
                        {renderModelName(model, true)}
                        <p className="text-sm text-muted-foreground">{model.provider}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium font-mono">
                        {visibleColumns.includes("inputCost") && <div>In: {model.inputCost}</div>}
                        {visibleColumns.includes("outputCost") && <div>Out: {model.outputCost}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm ml-6">
                    {visibleColumns.includes("contextWindow") && (
                      <>
                        <div className="text-muted-foreground">Context:</div>
                        <div className="font-mono">{model.contextWindow}</div>
                      </>
                    )}
                  </div>

                  {visibleColumns.includes("features") && model.features.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 ml-6">
                      {model.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2 ml-6 line-clamp-2">{model.description}</p>
                </Card>
              ))
            )}
          </div>

          {hasMoreModels && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={loadMoreModels} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Load More Models
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Desktop table view
        <div className="space-y-4">
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(
                      (column) =>
                        visibleColumns.includes(column.id) && (
                          <TableHead
                            key={column.id}
                            className={`cursor-pointer hover:bg-muted/50 ${column.id === "keep" ? "w-[60px]" : ""}`}
                            onClick={() => requestSort(column.id)}
                          >
                            <div className="flex items-center">
                              {column.label}
                              {renderSortIndicator(column.id)}
                            </div>
                          </TableHead>
                        ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedModels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-6">
                        No models found matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedModels.map((model) => (
                      <TableRow key={model.id} className={`${model.keep ? "bg-primary/5 sticky top-0 z-10" : ""}`}>
                        {visibleColumns.includes("keep") && (
                          <TableCell className="w-[60px]">
                            <Checkbox
                              id={`keep-${model.id}`}
                              checked={model.keep}
                              onCheckedChange={() => toggleKeep(model.id)}
                            />
                          </TableCell>
                        )}
                        {visibleColumns.includes("name") && <TableCell>{renderModelName(model)}</TableCell>}
                        {visibleColumns.includes("provider") && <TableCell>{model.provider}</TableCell>}
                        {visibleColumns.includes("contextWindow") && (
                          <TableCell className="font-mono">{model.contextWindow}</TableCell>
                        )}
                        {visibleColumns.includes("inputCost") && (
                          <TableCell className="font-mono">{model.inputCost}</TableCell>
                        )}
                        {visibleColumns.includes("outputCost") && (
                          <TableCell className="font-mono">{model.outputCost}</TableCell>
                        )}
                        {visibleColumns.includes("features") && (
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {model.features.map((feature, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {hasMoreModels && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={loadMoreModels} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Load More Models
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground gap-2">
        <div>
          Showing {displayedModels.length} of {sortedModels.length} models
        </div>
        <div className="flex items-center gap-1">
          {lastUpdated && <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>}
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Token costs are per 1K tokens</span>
          <span className="hidden sm:inline">•</span>
          <a
            href="https://github.com/famasya/v0-openrouter-models"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-primary hover:underline"
          >
            <Github className="h-3 w-3" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </div>
  )
}
