import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  basePath: string;
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageParam?: string;
  preserveParams?: Record<string, string>;
};

function pageHref(basePath: string, page: number, pageParam: string, preserveParams: Record<string, string>) {
  const query = { ...preserveParams };
  if (page > 1) {
    query[pageParam] = String(page);
  } else {
    delete query[pageParam];
  }
  return { pathname: basePath, query };
}

export function PaginationControls({ basePath, currentPage, totalItems, pageSize, pageParam = "page", preserveParams = {} }: PaginationControlsProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const from = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>Showing {from}-{to} of {totalItems}</span>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" aria-disabled={currentPage <= 1} className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}>
          <Link href={pageHref(basePath, currentPage - 1, pageParam, preserveParams)}><ChevronLeft className="h-4 w-4" />Previous</Link>
        </Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button asChild variant="outline" size="sm" aria-disabled={currentPage >= totalPages} className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}>
          <Link href={pageHref(basePath, currentPage + 1, pageParam, preserveParams)}>Next<ChevronRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
