import * as React from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { cn } from "~/lib/utils";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "~/components/ui/collapsible";

interface TreeItem {
	id: string;
	name: string;
	type: "company" | "store";
	currency?: string;
	children?: TreeItem[];
}

interface TreeProps {
	data: TreeItem[] | TreeItem;
	className?: string;
}

export function Tree({ data, className }: TreeProps) {
	const items = Array.isArray(data) ? data : [data];
	return (
		<div className={cn("overflow-hidden rounded-md border p-2", className)}>
			{items.map((item) => (
				<TreeNode key={item.id} item={item} />
			))}
		</div>
	);
}

function TreeNode({ item }: { item: TreeItem }) {
	const [isOpen, setIsOpen] = React.useState(false);
	const hasChildren = item.children && item.children.length > 0;

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<div className="flex items-center py-1">
				<CollapsibleTrigger asChild>
					<button
						className={cn(
							"flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-accent",
							!hasChildren && "opacity-50 disabled:pointer-events-none",
						)}
						disabled={!hasChildren}
					>
						{hasChildren &&
							(isOpen ? (
								<ChevronDown className="h-4 w-4" />
							) : (
								<ChevronRight className="h-4 w-4" />
							))}
					</button>
				</CollapsibleTrigger>

				<span className="ml-1 flex items-center gap-2 text-sm">
					{item.type === "company" ? (
						<Folder className="h-4 w-4 text-blue-500" />
					) : (
						<File className="h-4 w-4 text-gray-500" />
					)}
					{item.name}
					{item.currency && (
						<span className="text-xs text-gray-600">({item.currency})</span>
					)}
				</span>
			</div>

			{hasChildren && (
				<CollapsibleContent>
					<div className="ml-4 border-l pl-2">
						{item.children?.map((child) => (
							<TreeNode key={child.id} item={child} />
						))}
					</div>
				</CollapsibleContent>
			)}
		</Collapsible>
	);
}
