"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Github,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react"
import { useEffect, useState } from "react"

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
  imageCost: string
  features: string[]
  keep: boolean
  description: string
  input_cache_read: string
  input_cache_write: string
  modalities: string[]
}

// Column configuration
const columns = [
  { id: "keep", label: "Keep", always: true },
  { id: "name", label: "Model", always: true },
  { id: "provider", label: "Provider", always: true },
  { id: "contextWindow", label: "Context", always: false },
  { id: "inputCost", label: "Input Cost", always: true },
  { id: "outputCost", label: "Output Cost", always: true },
  { id: "imageCost", label: "Image Cost", always: true },
  { id: "modalities", label: "Modalities", always: false },
  { id: "input_cache_read", label: "Cache Read Cost", always: false },
  { id: "input_cache_write", label: "Cache Write Cost", always: false },
  { id: "features", label: "Features", always: false },
]

const MODELS_PER_PAGE = 15

export default function PricingTable() {
  const [modelData, setModelData] = useState<ModelData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [visibleColumns, setVisibleColumns] = useState(columns.filter((col) => col.always).map((col) => col.id))
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  }>({ key: "inputCost", direction: "ascending" })
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterOutFree, setFilterOutFree] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [displayLimit, setDisplayLimit] = useState(MODELS_PER_PAGE)
  const [showDescriptions, setShowDescriptions] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Custom debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

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

      const transformedData: ModelData[] = data.data.map((model) => {
        const providerFromId = model.id.split("/")[0]
        const provider = capitalizeFirstLetter(providerFromId)
        const contextWindow = formatContextSize(model.context_length)
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
          input_cache_read: model.pricing.input_cache_read ? formatPrice(model.pricing.input_cache_read) : "N/A",
          input_cache_write: model.pricing.input_cache_write ? formatPrice(model.pricing.input_cache_write) : "N/A",
          imageCost: model.pricing.image ? formatPrice(model.pricing.image) : "N/A",
        }
      })

      setModelData(transformedData)
      setLastUpdated(new Date())
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
    const pricePerToken = Number.parseFloat(price)
    if (pricePerToken < 0) return "N/A"
    const pricePerMillionTokens = pricePerToken * 1_000_000
    return `$${pricePerMillionTokens.toFixed(pricePerMillionTokens < 0.001 ? 3 : pricePerMillionTokens < 0.01 ? 2 : 1)}`
  }

  const extractFeatures = (model: OpenRouterModel) => {
    const features: string[] = []
    if (model.architecture.input_modalities.includes("image")) {
      features.push("Vision")
    }
    if (model.supported_parameters.includes("tools") || model.supported_parameters.includes("function_call")) {
      features.push("Function calling")
    }
    if (model.context_length >= 100000) {
      features.push("Long context")
    }
    if (model.architecture.modality === "multimodal") {
      features.push("Multimodal")
    }
    return features
  }

  useEffect(() => {
    fetchModels()
  }, [])

  useEffect(() => {
    setVisibleColumns(columns.filter((col) => col.always || !isMobile).map((col) => col.id))
  }, [isMobile])

  useEffect(() => {
    setDisplayLimit(MODELS_PER_PAGE)
  }, [debouncedSearchQuery, activeFilters, filterOutFree])

  const toggleKeep = (id: string) => {
    setModelData((prev) => prev.map((model) => (model.id === id ? { ...model, keep: !model.keep } : model)))
  }

  const filteredModels = modelData.filter((model) => {
    if (model.keep) return true

    const searchTerms = debouncedSearchQuery.split(" ")
    const allTermsMatch = searchTerms.every((term) => model.name.toLowerCase().includes(term.toLowerCase()))
    const searchLower = debouncedSearchQuery.toLowerCase()
    const matchesSearch =
      allTermsMatch ||
      model.provider.toLowerCase().includes(searchLower) ||
      model.modalities.some((modality) => modality.toLowerCase().includes(searchLower)) ||
      model.description.toLowerCase().includes(searchLower) ||
      model.features.some((feature) => feature.toLowerCase().includes(searchLower))

    const matchesProviderFilter = activeFilters.length === 0 || activeFilters.includes(model.provider)
    const isFree =
      model.name.includes("(free)") ||
      Number.parseFloat(model.inputCost.replace("$", "")) === 0 ||
      Number.parseFloat(model.outputCost.replace("$", "")) === 0
    const matchesFreeFilter = !filterOutFree || !isFree

    return matchesSearch && matchesProviderFilter && matchesFreeFilter
  })

  const sortedModels = [...filteredModels].sort((a, b) => {
    if (a.keep && !b.keep) return -1
    if (!a.keep && b.keep) return 1

    if (sortConfig) {
      if (sortConfig.key === "keep") {
        return sortConfig.direction === "ascending" ? Number(a.keep) - Number(b.keep) : Number(b.keep) - Number(a.keep)
      }
      const aValue = a[sortConfig.key as keyof typeof a]
      const bValue = b[sortConfig.key as keyof typeof b]
      if (sortConfig.key === "inputCost" || sortConfig.key === "outputCost") {
        const aNum = Number.parseFloat(String(aValue).replace("$", ""))
        const bNum = Number.parseFloat(String(bValue).replace("$", ""))
        return sortConfig.direction === "ascending" ? aNum - bNum : bNum - aNum
      }
      if (sortConfig.key === "contextWindow") {
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

  const displayedModels = sortedModels.slice(0, displayLimit)
  const hasMoreModels = sortedModels.length > displayLimit

  const loadMoreModels = () => {
    setDisplayLimit((prev) => prev + MODELS_PER_PAGE)
  }

  const providers = Array.from(new Set(modelData.map((model) => model.provider)))

  const toggleProviderFilter = (provider: string) => {
    setActiveFilters((prev) => (prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]))
  }

  const clearFilters = () => {
    setActiveFilters([])
    setSearchQuery("")
    setFilterOutFree(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  function parseContextSize(sizeStr: string): number {
    const match = sizeStr.match(/(\d+)([KM])?/)
    if (!match) return 0
    const [, num, unit] = match
    const baseNum = Number.parseInt(num, 10)
    if (unit === "K") return baseNum * 1000
    if (unit === "M") return baseNum * 1000000
    return baseNum
  }

  const toggleColumn = (columnId: string) => {
    setVisibleColumns((prev) => (prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]))
  }

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  const renderSortIndicator = (columnId: string) => {
    if (sortConfig?.key !== columnId) return null
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 inline" />
    )
  }

  const renderModelName = (model: ModelData, isCard = false) => {
    return (
      <div className="space-y-1">
        <div className={`flex items-center gap-2 ${isCard ? "font-semibold text-sm" : "font-medium text-sm"}`}>
          <a
            href={model.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:text-blue-600 hover:underline inline-flex items-center transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {model.name}
          </a>
          <ExternalLink className="w-3 h-3 flex-shrink-0 text-muted-foreground opacity-60" />
        </div>
        {showDescriptions && <p className="text-xs text-muted-foreground leading-relaxed mb-2">{model.description}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-1">
      {/* Compact Controls */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border shadow-sm p-4 space-y-4">
        {/* Search and Main Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models, providers, features..."
              className="pl-10 h-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchModels}
              disabled={isLoading}
              className="h-9 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading} className="h-9 bg-transparent">
                  <Filter className="h-4 w-4 mr-1" />
                  Providers
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
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
                <Button variant="outline" size="sm" disabled={isLoading} className="h-9 bg-transparent">
                  <SlidersHorizontal className="h-4 w-4 mr-1" />
                  Columns
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
          </div>
        </div>

        {/* Filter Toggles */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex gap-2">
            <Button
              variant={filterOutFree ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterOutFree(!filterOutFree)}
              disabled={isLoading}
              className="h-8 text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              Hide Free
            </Button>
            <Button
              variant={showDescriptions ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDescriptions(!showDescriptions)}
              disabled={isLoading}
              className="h-8 text-xs"
            >
              {showDescriptions ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              Descriptions
            </Button>
          </div>

          <div>
            {/* Quick Sort Buttons */}
            <div className="flex gap-1 ml-auto">
              <Button
                variant={sortConfig.key === "inputCost" ? "default" : "outline"}
                size="sm"
                onClick={() => requestSort("inputCost")}
                className="h-8 text-xs"
                disabled={isLoading}
              >
                Input Cost {sortConfig.key === "inputCost" && renderSortIndicator("inputCost")}
              </Button>
              <Button
                variant={sortConfig.key === "outputCost" ? "default" : "outline"}
                size="sm"
                onClick={() => requestSort("outputCost")}
                className="h-8 text-xs"
                disabled={isLoading}
              >
                Output Cost {sortConfig.key === "outputCost" && renderSortIndicator("outputCost")}
              </Button>
              <Button
                variant={sortConfig.key === "imageCost" ? "default" : "outline"}
                size="sm"
                onClick={() => requestSort("imageCost")}
                className="h-8 text-xs"
                disabled={isLoading}
              >
                Image Cost {sortConfig.key === "imageCost" && renderSortIndicator("imageCost")}
              </Button>
            </div>
          </div>

          {(activeFilters.length > 0 || searchQuery || filterOutFree) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {isMobile ? (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden bg-white dark:bg-gray-950">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    {columns.map(
                      (column) =>
                        visibleColumns.includes(column.id) && (
                          <TableHead key={column.id} className="h-10 text-xs font-medium">
                            {column.label}
                          </TableHead>
                        ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      {visibleColumns.map((column) => (
                        <TableCell key={column} className="h-12">
                          <Skeleton className="h-3 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {displayedModels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No models found matching your criteria</p>
            </div>
          ) : (
            displayedModels.map((model) => (
              <Card
                key={model.id}
                className={cn(
                  "p-4 transition-all hover:shadow-md",
                  model.keep ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm" : "",
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`keep-mobile-${model.id}`}
                      checked={model.keep}
                      onCheckedChange={() => toggleKeep(model.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      {renderModelName(model, true)}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs h-5">
                          {model.provider}
                        </Badge>
                        {model.features.slice(0, 2).map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs h-5">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pl-7">
                    {visibleColumns.includes("inputCost") && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Input:</span>
                        <span className="font-mono text-xs">{model.inputCost}</span>
                      </div>
                    )}
                    {visibleColumns.includes("outputCost") && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Output:</span>
                        <span className="font-mono text-xs">{model.outputCost}</span>
                      </div>
                    )}
                    {visibleColumns.includes("contextWindow") && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Context:</span>
                        <span className="font-mono text-xs">{model.contextWindow}</span>
                      </div>
                    )}
                    {visibleColumns.includes("imageCost") && model.imageCost !== "N/A" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Image:</span>
                        <span className="font-mono text-xs">{model.imageCost}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}

          {hasMoreModels && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMoreModels} className="gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Load {Math.min(MODELS_PER_PAGE, sortedModels.length - displayLimit)} More
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b">
                {columns.map(
                  (column) =>
                    visibleColumns.includes(column.id) && (
                      <TableHead
                        key={column.id}
                        className={cn(
                          "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors h-11 text-xs font-semibold",
                          column.id === "keep" ? "w-12" : "",
                        )}
                        onClick={() => requestSort(column.id)}
                      >
                        <div className="flex items-center gap-1">
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
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12">
                    <div className="text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No models found matching your criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedModels.map((model, index) => (
                  <TableRow
                    key={model.id}
                    className={cn(
                      "text-sm hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors",
                      model.keep ? "bg-blue-50/50 dark:bg-blue-950/20 border-l-2 border-l-blue-400" : "",
                      index % 2 === 0 ? "bg-gray-50/30 dark:bg-gray-900/20" : "",
                    )}
                  >
                    {visibleColumns.includes("keep") && (
                      <TableCell className="w-12">
                        <Checkbox
                          id={`keep-${model.id}`}
                          checked={model.keep}
                          onCheckedChange={() => toggleKeep(model.id)}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.includes("name") && (
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(model.id)}
                                  className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy model ID</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {renderModelName(model)}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("provider") && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {model.provider}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("contextWindow") && (
                      <TableCell className="font-mono text-xs">{model.contextWindow}</TableCell>
                    )}
                    {visibleColumns.includes("inputCost") && (
                      <TableCell className="font-mono text-xs font-medium">{model.inputCost}</TableCell>
                    )}
                    {visibleColumns.includes("outputCost") && (
                      <TableCell className="font-mono text-xs font-medium">{model.outputCost}</TableCell>
                    )}
                    {visibleColumns.includes("imageCost") && (
                      <TableCell className="font-mono text-xs">{model.imageCost}</TableCell>
                    )}
                    {visibleColumns.includes("modalities") && (
                      <TableCell className="text-xs">{model.modalities.join(", ")}</TableCell>
                    )}
                    {visibleColumns.includes("input_cache_read") && (
                      <TableCell className="font-mono text-xs">{model.input_cache_read}</TableCell>
                    )}
                    {visibleColumns.includes("input_cache_write") && (
                      <TableCell className="font-mono text-xs">{model.input_cache_write}</TableCell>
                    )}
                    {visibleColumns.includes("features") && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {model.features.slice(0, 3).map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs h-5">
                              {feature}
                            </Badge>
                          ))}
                          {model.features.length > 3 && (
                            <Badge variant="outline" className="text-xs h-5">
                              +{model.features.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {hasMoreModels && (
            <div className="border-t bg-gray-50 dark:bg-gray-900 p-4 text-center">
              <Button variant="outline" onClick={loadMoreModels} className="gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Load {Math.min(MODELS_PER_PAGE, sortedModels.length - displayLimit)} More Models
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground gap-3 pt-4 border-t">
        <div className="flex items-center gap-4">
          <span>
            Showing {displayedModels.length} of {sortedModels.length} models
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Costs per 1M tokens</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/famasya/v0-openrouter-models"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Github className="h-3 w-3" />
            <span>GitHub</span>
          </a>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            OpenRouter API
          </span>
          {lastUpdated && (
            <span className="bg-white/60 dark:bg-black/20 px-2 py-1 rounded-md">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
