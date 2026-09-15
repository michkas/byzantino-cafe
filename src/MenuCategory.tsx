import type { Category, MenuItem as MenuItemType } from './types'
import MenuItem from './MenuItem'

interface MenuCategoryProps {
  category: Category
  items: MenuItemType[]
  currencySymbol: string
  lang: string
}

export default function MenuCategory({ category, items, currencySymbol, lang }: MenuCategoryProps) {
  if (items.length === 0) return null

  const categoryTitle = category.Name[lang] || category.Name.en || Object.values(category.Name)[0]

  return (
    <div className="menu-content rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs">
      <h3 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-neutral-900 border-b border-neutral-200 pb-2 mb-2">
        {categoryTitle}
      </h3>
      <ul className="divide-y divide-neutral-100 list-none p-0 m-0">
        {items.map((item) => (
          <MenuItem
            key={item.Id}
            item={item}
            currencySymbol={currencySymbol}
            lang={lang}
          />
        ))}
      </ul>
    </div>
  )
}