import menuDataRaw from './menu-data.json';
import type { MenuSchema, Category } from './types';

// Cast the imported raw JSON to ensure strict compliance with your schema
const menuData = menuDataRaw as MenuSchema;

// Active application state
let currentLang: string = 'el'; // Set to 'en' or 'el' dynamically
const currencyInfo = menuData.Currencies.EUR;

const appContainer = document.getElementById('menu-app');

function renderMenu(): void {
  if (!appContainer) return;
  appContainer.innerHTML = ''; // Reset layout for language switches

  // 1. Find Top-Level Categories
  const topCategories = menuData.Categories.filter((cat) => cat.ParentCategoryId === null);

  topCategories.forEach((parentCat: Category) => {
    const section = document.createElement('section');
    section.className = 'menu-section';

    const heading = document.createElement('h2');
    heading.textContent = parentCat.Name[currentLang] || parentCat.Name['en'];
    section.appendChild(heading);

    // 2. Identify child subcategories
    const subCategories = menuData.Categories.filter((cat) => cat.ParentCategoryId === parentCat.Id);

    if (subCategories.length > 0) {
      subCategories.forEach((subCat: Category) => {
        const subHeading = document.createElement('h3');
        subHeading.textContent = subCat.Name[currentLang] || subCat.Name['en'];
        section.appendChild(subHeading);

        renderItemsList(subCat.Id, section);
      });
    } else {
      // Direct items map if no deeper structural subcategory exists
      renderItemsList(parentCat.Id, section);
    }

    appContainer.appendChild(section);
  });
}

function renderItemsList(categoryId: string, container: HTMLElement): void {
  const ul = document.createElement('ul');
  ul.className = 'items-grid';

  const filteredItems = menuData.Items.filter((item) => item.ParentCategoryId === categoryId);

  filteredItems.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'menu-item';

    const localizedPrice = `${item.Price.Value.toFixed(2)}${currencyInfo.Symbol}`;
    const localizedName = item.Name[currentLang] || item.Name['en'];

    li.innerHTML = `
        <span class="item-name">${localizedName}</span>
        <span class="item-dots"></span>
        <span class="item-price">${localizedPrice}</span>
    `;
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// Kick off initial compilation rendering
renderMenu();

// Optional: Global window function to hook into simple HTML layout buttons for toggling lang
(window as any).setLanguage = (lang: string): void => {
  currentLang = lang;
  renderMenu();
};
