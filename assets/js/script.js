/*

✦─────⋅☾ Global Variables ☽⋅─────✦

*/

let itemData = {};
let currentView = 'sell-order'; // Default view
const API_URL = 'https://api.hypixel.net/v2/skyblock/bazaar';
const cooldownDuration = 3000; // Cooldown duration in milliseconds

/*

✦─────⋅☾ Fetch Data Functions ☽⋅─────✦

*/

async function fetchItemData() {
    try {
        const response = await fetch('/data/item_data.json');
        itemData = await response.json();
    } catch (error) {
        console.error('Error fetching item data:', error);
        displayError('Failed to load item data. Please try again later.');
    }
}

async function fetchNpcItems() {
    try {
        const response = await fetch('/data/npc_items.json');
        return await response.json();
    } catch (error) {
        console.error('Error fetching NPC items data:', error);
        
        return {}; // Return an empty object in case of error
    }
}

async function fetchBazaarData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('API request was not successful');
        }

        return data.products;
    } catch (error) {
        console.error('Error fetching Bazaar data:', error);
        displayError('Failed to load Bazaar data. Please try again later.');
        return {}; // Return an empty object in case of error
    }
}

async function fetchData() {
    console.log('Fetching new data...');
    showLoadingIndicator(); // Show loading indicator

    await fetchItemData();
    const npcItems = await fetchNpcItems();
    const products = await fetchBazaarData();
    
    updateItemCards(products, npcItems);
    hideLoadingIndicator(); // Hide loading indicator
}

/*

✦─────⋅☾ Data Processing Functions ☽⋅─────✦

*/

function updateItemCards(products, npcItems) {
    const itemCardsContainer = document.getElementById('item-cards');
    itemCardsContainer.innerHTML = ''; // Clear existing cards

    const cards = Object.keys(products).flatMap(key => {
        const item = products[key];
        if (!item) return []; // Skip if item is missing

        const { product_id, sell_summary = [], buy_summary = [] } = item;
        const npcItemsList = npcItems[product_id];
        if (!npcItemsList) return []; // Skip if no NPC items

        // Use the first entry in sell_summary for insta sell price
        const instaPriceData = sell_summary[0];
        const sellPrice = instaPriceData ? instaPriceData.pricePerUnit : 0;
        if (!instaPriceData) return []; // Skip if no price data

        // Use the first entry in buy_summary for sell order price
        const orderPriceData = buy_summary[0];
        const orderPrice = orderPriceData ? orderPriceData.pricePerUnit : 0;
        if (!orderPriceData) return []; // Skip if no price data

        const npcItemsArray = Array.isArray(npcItemsList) ? npcItemsList : [npcItemsList];

        return npcItemsArray.flatMap(npcItem => {
            const buyPrice = npcItem.price || 0; // NPC buy price

            // Calculate profit margin using Insta Sell price
            const instaProfitMargin = calculateProfitMargin(sellPrice, buyPrice);

            // Only include items that can be Insta Sold for Profit
            if (instaProfitMargin <= 0) return []; // Skip low profit margin items

            // Choose the profit margin based on the current view
            const profitMargin = currentView === 'insta-sell'
                ? instaProfitMargin 
                : calculateProfitMargin(orderPrice, buyPrice);

            // Calculate daily profit based on the selected profit margin
            const dailyProfit = calculateDailyProfit(profitMargin);
                
            return [createCardElement(product_id, sellPrice, orderPrice, buyPrice, profitMargin, dailyProfit, npcItem)];
        });
    });

    cards.sort((a, b) => b.profitMargin - a.profitMargin); // Sort by highest profit margin

    // Use a document fragment for better performance
    const fragment = document.createDocumentFragment();
    cards.forEach(card => fragment.appendChild(card.element));
    itemCardsContainer.appendChild(fragment);
}

function calculateProfitMargin(pricePerUnit, buyPrice) {
    return pricePerUnit - buyPrice;
}

function calculateDailyProfit(profitMargin) {
    return profitMargin * 640; // Multiply by daily purchase limit
}

function createCardElement(product_id, sellPrice, orderPrice, buyPrice, profitMargin, dailyProfit, npcItem) {
    const formattedBuyPrice = formatPrice(buyPrice);
    const formattedSellPrice = formatPrice(currentView === 'insta-sell' ? sellPrice : orderPrice);
    const formattedProfitMargin = formatPrice(profitMargin);
    const formattedDailyProfit = formatPrice(dailyProfit);

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-header">
            <div class="title-container">
                <h2>${getItemName(product_id)}</h2>
            </div>
            <img src="${getItemImage(product_id)}" alt="${getItemName(product_id)}">
        </div>
        <hr>
        <div class="card-price-info">
            <p><span>Buy Price:</span><span>${formattedBuyPrice}</span></p>
            <p><span>Sell Price:</span><span>${formattedSellPrice}</span></p>
        </div>
        <hr>
        <div class="card-price-info">
            <p><span>Profit Margin:</span><span>${formattedProfitMargin}</span></p>
            <p><span>Daily Profit:</span><span>${formattedDailyProfit}</span></p>
        </div>
        <hr>
        <div class="card-npc-info">
            <p><span>NPC:</span><span>${npcItem.npc || 'N/A'}</span></p>
            <p><span>Island:</span><span>${npcItem.island || 'N/A'}</span></p>
        </div>
    `;

    return { element: card, profitMargin };
}

function formatPrice(price) {
    return price.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

/*

✦─────⋅☾ Utility Functions ☽⋅─────✦

*/

function getItemName(product_id) {
    const item = itemData[product_id];
    return item ? item.name : product_id; // Return item name or product_id if not found
}

function getItemImage(product_id) {
    const item = itemData[product_id];
    return item && item.image ? `/assets/images/${item.image}` : ''; // Return item image path or default
}

function displayError(message) {
    const errorContainer = document.getElementById('error-message');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block'; // Show error message
}

function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = 'block'; // Show loading indicator
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = 'none'; // Hide loading indicator
}

/*

✦─────⋅☾ Initialization ☽⋅─────✦

*/

document.addEventListener('DOMContentLoaded', fetchData);
setInterval(fetchData, 10000); // Set up interval to refresh data every 10 seconds

document.addEventListener('DOMContentLoaded', () => {
    // Set the initial view based on the checkbox state
    currentView = document.getElementById('view-toggle').checked ? 'sell-order' : 'insta-sell';
    fetchData(); // Fetch data on page load
});

document.getElementById('view-toggle').addEventListener('change', (event) => {
    const toggleButton = document.getElementById('view-toggle');
    const slider = toggleButton.nextElementSibling; // Get the slider element

    // Disable the toggle button and apply the disabled class
    toggleButton.disabled = true; // Disable the toggle
    slider.classList.add('disabled'); // Add disabled class to the slider

    // Update the current view based on the toggle
    currentView = event.target.checked ? 'sell-order' : 'insta-sell'; 
    fetchData(); // Re-fetch data to update the displayed cards

    // Set a timeout to re-enable the toggle button after cooldown duration
    setTimeout(() => {
        toggleButton.disabled = false; // Re-enable the toggle
        slider.classList.remove('disabled'); // Remove disabled class from the slider
    }, cooldownDuration); // Use the defined cooldown duration
});