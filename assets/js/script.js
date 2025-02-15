/*

✦─────⋅☾ Global Variables ☽⋅─────✦

*/

let itemData = {};
let npcItems = {};
let currentView = 'sell-order'; // Default view
const API_URL = 'https://api.hypixel.net/v2/skyblock/bazaar';
const ITEM_DATA_URL = '/data/item_data.json';
const NPC_ITEMS_URL = '/data/npc_items.json';
const MONTH = 30 * 24 * 60 * 60 * 1000; // One month in milliseconds
let storedProducts = {}; // Variable to store fetched products

/*

✦─────⋅☾ Debounce Function ☽⋅─────✦

*/

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/*

✦─────⋅☾ Fetch Data Functions ☽⋅─────✦
*/

async function fetchStaticData() {
    try {
        const itemDataResponse = await fetch(ITEM_DATA_URL);
        const npcItemsResponse = await fetch(NPC_ITEMS_URL);
        
        itemData = await itemDataResponse.json();
        npcItems = await npcItemsResponse.json();

        // Store in local storage
        localStorage.setItem('itemData', JSON.stringify(itemData));
        localStorage.setItem('npcItems', JSON.stringify(npcItems));
        localStorage.setItem('lastUpdate', new Date().toISOString()); // Store the last update date
    } catch (error) {
        console.error('Error fetching static data:', error);
    }
}

/*

✦─────⋅☾ Load Static Data from Local Storage ☽⋅─────✦

*/

async function loadStaticData() {
    const storedItemData = localStorage.getItem('itemData');
    const storedNpcItems = localStorage.getItem('npcItems');
    const lastUpdate = localStorage.getItem('lastUpdate');

    const now = new Date();

    // Check if we need to update the data
    if (storedItemData && storedNpcItems && lastUpdate) {
        const lastUpdateDate = new Date(lastUpdate);
        if (now - lastUpdateDate < MONTH) {
            itemData = JSON.parse(storedItemData);
            npcItems = JSON.parse(storedNpcItems);
            return;
        }
    }

    await fetchStaticData(); // Fetch if data is outdated
}

/*

✦─────⋅☾ Fetch Data Functions ☽⋅─────✦

*/

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

    // Fetch Item Data & NPC Items if not loaded from local storage
    loadStaticData(); // Load static data from local storage

    // Fetch Bazaar Data
    try {
        storedProducts = await fetchBazaarData(); // Store fetched products
        updateItemCards(storedProducts, npcItems);
    } catch (error) {
        console.error('Error fetching data:', error);
        displayError('Failed to load data. Please try again later.');
    } finally {
        hideLoadingIndicator(); // Hide loading indicator
    }
}

/*

✦─────⋅☾ Data Processing Functions ☽⋅─────✦

*/

function updateItemCards(products, npcItems) {
    const itemCardsContainer = document.getElementById('item-cards');
    itemCardsContainer.innerHTML = ''; // Clear existing cards

    // Create an array to store the card data
    const cards = [];

    Object.keys(products).forEach(key => {
        const item = products[key];
        if (!item) return; // Skip if item is missing

        const { product_id, sell_summary = [], buy_summary = [], quick_status = {} } = item;
        const npcItemsList = npcItems[product_id];
        if (!npcItemsList) return; // Skip if no NPC items

        // Retrieve sell and buy volumes from quick_status
        const sellVolume = quick_status.sellVolume || 0;
        const buyVolume = quick_status.buyVolume || 0;

        // Define minimum threshold for sell and buy volume
        const MIN_SELL_VOLUME = 16000; // Minimum sell volume threshold
        const MIN_BUY_VOLUME = 16000; // Minimum buy volume threshold

        // Skip items that have low sell or buy volume
        if (sellVolume < MIN_SELL_VOLUME || buyVolume < MIN_BUY_VOLUME) return;

        // Use the first entry in sell_summary for insta sell price
        const instaPriceData = sell_summary[0];
        const sellPrice = instaPriceData ? instaPriceData.pricePerUnit : 0;
        if (!instaPriceData) return; // Skip if no price data

        // Use the first entry in buy_summary for sell order price
        const orderPriceData = buy_summary[0];
        const orderPrice = orderPriceData ? orderPriceData.pricePerUnit : 0;
        if (!orderPriceData) return; // Skip if no price data

        const npcItemsArray = Array.isArray(npcItemsList) ? npcItemsList : [npcItemsList];

        npcItemsArray.forEach(npcItem => {
            const buyPrice = npcItem.price || 0; // NPC buy price

            // Calculate profit margin using Insta Sell price
            const instaProfitMargin = calculateProfitMargin(sellPrice, buyPrice);

            // Calculate profit margin for sell orders
            const sellOrderProfitMargin = calculateProfitMargin(orderPrice, buyPrice);

            // Only include items that can be Insta Sold or Sell Ordered for Profit
            if (instaProfitMargin <= 0 && sellOrderProfitMargin <= 0) return; // Skip items with no profit

            // Choose the profit margin based on the current view
            const profitMargin = currentView === 'insta-sell'
                ? instaProfitMargin
                : sellOrderProfitMargin;

            // Calculate daily profit based on the selected profit margin
            const dailyProfit = calculateDailyProfit(profitMargin);

            // Only add cards with positive profit margin
            if (profitMargin > 0) {
                const card = createCardElement(product_id, sellPrice, orderPrice, buyPrice, profitMargin, dailyProfit, npcItem);
                cards.push({ element: card.element, profitMargin }); // Add to cards array
            }
        });
    });

    // Sort cards by profit margin (highest to lowest)
    cards.sort((a, b) => b.profitMargin - a.profitMargin);

    // Use a document fragment for better performance
    const fragment = document.createDocumentFragment();
    cards.forEach(card => fragment.appendChild(card.element)); // Append sorted cards

    // Append the document fragment to the container
    itemCardsContainer.appendChild(fragment);
}

function calculateProfitMargin(pricePerUnit, buyPrice) {
    return pricePerUnit - buyPrice;
}

function calculateDailyProfit(profitMargin) {
    return profitMargin * 640; // Multiply by daily purchase limit
}

function calculateSellSpeed(item) {
    // Calculate the buy volume for the past week
    const buyVolume = item.buy_summary ? item.buy_summary[0].amount : 0;

    // Divide the buy volume by 10,080 (minutes in a week) to get the sell speed
    const sellSpeed = buyVolume / 10080;

    return sellSpeed;
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
    return item && item.image ? item.image : ''; // Return the image URL
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

document.addEventListener('DOMContentLoaded', async () => {
    loadStaticData(); // Load static data from local storage
    await fetchData(); // Fetch Data on Page Load
    setInterval(fetchData, 60000); // Set Interval to Refresh Data every Min
});

document.getElementById('view-toggle').addEventListener('change', debounce((event) => {
    // Update the current view based on the toggle
    currentView = event.target.checked ? 'sell-order' : 'insta-sell'; 

    // Use the stored products to update the displayed cards
    updateItemCards(storedProducts, npcItems); // Use previously fetched data
}, 300)); // Debounce with a 300ms delay