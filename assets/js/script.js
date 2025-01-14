/*

✦─────⋅☾ Global Variables ☽⋅─────✦

*/

let itemData = {};
let priceType = 'sell_order'; // Default price type

/*

✦─────⋅☾ Helper Functions ☽⋅─────✦

*/

function formatTimeAgo(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds} secs ago`;
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

/*

✦─────⋅☾ Fetch Data Functions ☽⋅─────✦

*/

async function fetchItemData() {
    try {
        const response = await fetch('/data/item_data.json')
        itemData = await response.json();
    } catch (error) {
        console.error('Error fetching item data:', error);
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
        const response = await fetch('https://api.hypixel.net/v2/skyblock/bazaar');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('API request was not successful');
        }

        return data.products;
    } catch (error) {
        console.error('Error fetching Bazaar data:', error);
        return {}; // Return an empty object in case of error
    }
}

async function fetchData() {
    console.log('Fetching new data...');

    await fetchItemData();
    const npcItems = await fetchNpcItems();
    console.log('NPC Items:', npcItems); // Add this
    const products = await fetchBazaarData();
    console.log('Bazaar Products:', products); // Add this
    
    updateItemCards(products, npcItems);
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

        const { product_id, sell_summary = [] } = item;
        const npcItemsList = npcItems[product_id];
        if (!npcItemsList) return []; // Skip if no NPC items

        const priceData = sell_summary[0]; // Use the first entry in sell_summary for insta-sell price
        if (!priceData) return []; // Skip if no price data

        const pricePerUnit = priceData.pricePerUnit || 0; // Insta-sell price
        const npcItemsArray = Array.isArray(npcItemsList) ? npcItemsList : [npcItemsList];

        return npcItemsArray.flatMap(npcItem => {
            const buyPrice = npcItem.price || 0; // NPC buy price
            const profitMargin = calculateProfitMargin(pricePerUnit, buyPrice);
            if (profitMargin <= 0) return []; // Skip low profit margin items

            const dailyProfit = calculateDailyProfit(profitMargin); // Calculate daily profit
            return [createCardElement(product_id, pricePerUnit, buyPrice, profitMargin, dailyProfit, npcItem)];
        });
    });

    cards.sort((a, b) => b.profitMargin - a.profitMargin); // Sort by highest profit margin
    cards.forEach(card => itemCardsContainer.appendChild(card.element));
}

function calculateProfitMargin(pricePerUnit, buyPrice) {
    return pricePerUnit - buyPrice;
}

function calculateDailyProfit(profitMargin) {
    return profitMargin * 640; // Multiply by daily purchase limit
}

function createCardElement(product_id, pricePerUnit, buyPrice, profitMargin, dailyProfit, npcItem) {
    const formattedBuyPrice = formatPrice(buyPrice);
    const formattedSellPrice = formatPrice(pricePerUnit);
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
            <p><span>Island:</span><span>${npcItem.island || 'N/A'}</span></p>
            <p><span>NPC:</span><span>${npcItem.npc || 'N/A'}</span></p>
            ${npcItem.location ? `<p><span>Location:</span><span>${npcItem.location}</span></p>` : ''}
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

/*

✦─────⋅☾ Initialization ☽⋅─────✦

*/

document.addEventListener('DOMContentLoaded', fetchData);
setInterval(fetchData, 2000); // Set up interval to refresh data every 2 seconds

document.getElementById('price-type-toggle').addEventListener('change', (event) => {
    priceType = event.target.value;
    fetchData(); // Fetch new data based on selected price type
});