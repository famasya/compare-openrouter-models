"use client"

import { fetchModels, ModelData } from "@/app/fetcher"
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
  Loader2,
  Plus,
  Search,
  Sparkles,
  Zap
} from "lucide-react"
import { useEffect, useState } from "react"

// Column configuration
const columns = [
  { id: "keep", label: "Keep" },
  { id: "name", label: "Model" },
  { id: "provider", label: "Provider" },
  { id: "contextWindow", label: "Context" },
  { id: "inputCost", label: "Input Cost" },
  { id: "outputCost", label: "Output Cost" },
  { id: "imageCost", label: "Image Cost" },
  { id: "modalities", label: "Modalities" },
  { id: "input_cache_read", label: "Cache Read Cost" },
  { id: "input_cache_write", label: "Cache Write Cost" },
  { id: "features", label: "Features" },
]

const MODELS_PER_PAGE = 15

export default function PricingTable() {
  const [modelData, setModelData] = useState<ModelData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [visibleColumns, setVisibleColumns] = useState(columns.map((col) => col.id))
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  }>({ key: "inputCost", direction: "ascending" })
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterOutFree, setFilterOutFree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayLimit, setDisplayLimit] = useState(MODELS_PER_PAGE)
  const [showDescriptions, setShowDescriptions] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [lastUpdate, setLastUpdate] = useState("")

  // Fetch models
  useEffect(() => {
    fetchModels().then((models) => {
      setModelData(models)
    }).catch((error) => {
      setError(error.message)
    }).finally(() => {
      setFetching(false)
      setLastUpdate(new Date().toLocaleString())
    })
  }, [])

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

  useEffect(() => {
    setVisibleColumns(columns.map((col) => col.id))
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
            />
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 bg-transparent">
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
          </div>
        </div>

        {/* Filter Toggles */}
        <div className="flex flex-col md:flex-row md:justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant={filterOutFree ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterOutFree(!filterOutFree)}

              className="h-8 text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              Hide Free
            </Button>
            <Button
              variant={showDescriptions ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDescriptions(!showDescriptions)}

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

              >
                Input Cost {sortConfig.key === "inputCost" && renderSortIndicator("inputCost")}
              </Button>
              <Button
                variant={sortConfig.key === "outputCost" ? "default" : "outline"}
                size="sm"
                onClick={() => requestSort("outputCost")}
                className="h-8 text-xs"

              >
                Output Cost {sortConfig.key === "outputCost" && renderSortIndicator("outputCost")}
              </Button>
              <Button
                variant={sortConfig.key === "imageCost" ? "default" : "outline"}
                size="sm"
                onClick={() => requestSort("imageCost")}
                className="h-8 text-xs"

              >
                Image Cost {sortConfig.key === "imageCost" && renderSortIndicator("imageCost")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {isMobile ? (
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

                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Input:</span>
                      <span className="font-mono text-xs">{model.inputCost}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Output:</span>
                      <span className="font-mono text-xs">{model.outputCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Context:</span>
                      <span className="font-mono text-xs">{model.contextWindow}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Image:</span>
                      <span className="font-mono text-xs">{model.imageCost}</span>
                    </div>
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
                    {fetching ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
                        <p>Loading models...</p>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No models found matching your criteria</p>
                      </div>
                    )}
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
                    <TableCell className="w-12">
                      <Checkbox
                        id={`keep-${model.id}`}
                        checked={model.keep}
                        onCheckedChange={() => toggleKeep(model.id)}
                      />
                    </TableCell>
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
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {model.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{model.contextWindow}</TableCell>
                    <TableCell className="font-mono text-xs font-medium">{model.inputCost}</TableCell>
                    <TableCell className="font-mono text-xs font-medium">{model.outputCost}</TableCell>
                    <TableCell className="font-mono text-xs">{model.imageCost}</TableCell>
                    <TableCell className="text-xs">{model.modalities.join(", ")}</TableCell>
                    <TableCell className="font-mono text-xs">{model.input_cache_read}</TableCell>
                    <TableCell className="font-mono text-xs">{model.input_cache_write}</TableCell>
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
          <span className="bg-white/60 dark:bg-black/20 px-2 py-1 rounded-md">
            Updated: {lastUpdate}
          </span>
        </div>
      </div>
    </div>
  )
}
