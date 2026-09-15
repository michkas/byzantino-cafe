import type { MenuItem as MenuItemType } from './types'

interface MenuItemProps {
  item: MenuItemType
  currencySymbol: string
  lang: string
}

export default function MenuItem({ item, currencySymbol, lang }: MenuItemProps) {
  const itemName = item.Name[lang] || item.Name.en || Object.values(item.Name)[0]

  return (
    <li className="flex items-baseline justify-between gap-2 py-2 border-b border-neutral-100 last:border-b-0">
      <span className="text-sm sm:text-base font-normal tracking-[-0.01em] text-neutral-800">
        {itemName}
      </span>
      <span className="flex-1 mx-2 border-b border-dotted border-neutral-300 relative top-[-4px] min-w-4" aria-hidden="true" />
      <span className="text-sm sm:text-base font-semibold tabular-nums text-neutral-900 shrink-0">
        {currencySymbol}{item.Price.Value.toFixed(2)}
      </span>
    </li>
  )
}