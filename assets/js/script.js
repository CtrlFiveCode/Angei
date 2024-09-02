/*

✦─────⋅☾ Global Variables ☽⋅─────✦

*/

let itemData = {};
let priceType = 'sell_order'; // Default price type
let lastUpdateTime = new Date(); // Initialize with the current time

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

function updateLastUpdatedTime() {
    const now = new Date();
    const elapsedTime = now - lastUpdateTime; // Elapsed time in milliseconds
    const formattedTime = formatTimeAgo(elapsedTime);

    document.getElementById('last-updated').innerText = `Last updated: ${formattedTime}`;
}

/*

✦─────⋅☾ Fetch Data Functions ☽⋅─────✦

*/

async function fetchItemData() {
    try {
        const response = await fetch('/data/item_data.json');
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

    lastUpdateTime = new Date();
    updateLastUpdatedTime();
}

/*

✦─────⋅☾ Data Processing Functions ☽⋅─────✦

*/

function updateItemCards(products, npcItems) {
    const itemCardsContainer = document.getElementById('item-cards');
    itemCardsContainer.innerHTML = '';

    const cards = Object.keys(products).flatMap(key => {
        const item = products[key];
        if (!item) return []; // Skip if item is missing

        const { product_id, buy_summary = [], sell_summary = [] } = item;
        const npcItemsList = npcItems[product_id];
        if (!npcItemsList) return []; // Skip if no NPC items

        const priceData = priceType === 'sell_order' ? buy_summary[0] : sell_summary[0];
        if (!priceData) return []; // Skip if no price data

        const pricePerUnit = priceData.pricePerUnit || 0;
        const npcItemsArray = Array.isArray(npcItemsList) ? npcItemsList : [npcItemsList];

        return npcItemsArray.flatMap(npcItem => {
            const buyPrice = npcItem.price || 0;
            const profitMargin = calculateProfitMargin(pricePerUnit, buyPrice);
            if (profitMargin <= 0.1) return []; // Skip low profit margin items

            return [createCardElement(product_id, pricePerUnit, buyPrice, profitMargin, npcItem)];
        });
    });

    cards.sort((a, b) => b.profitMargin - a.profitMargin);
    cards.forEach(card => itemCardsContainer.appendChild(card.element));
}

function calculateProfitMargin(pricePerUnit, buyPrice) {
    return pricePerUnit - buyPrice - 0.1;
}

function createCardElement(product_id, pricePerUnit, buyPrice, profitMargin, npcItem) {
    const formattedBuyPrice = formatPrice(buyPrice);
    const formattedSellPrice = formatPrice(pricePerUnit);
    const formattedProfitMargin = formatPrice(profitMargin);

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
            <p><span>${priceType === 'sell_order' ? 'Sell Price' : 'Sell Price'}:</span><span>${formattedSellPrice}</span></p>
            <p><span>Profit Margin:</span><span>${formattedProfitMargin}</span></p>
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
setInterval(fetchData, 60000); // Set up interval to refresh data every 60 seconds
setInterval(updateLastUpdatedTime, 1000); // Set up an interval to update the "Last updated" time every second

document.getElementById('price-type-toggle').addEventListener('change', (event) => {
    priceType = event.target.value;
    fetchData(); // Fetch new data based on selected price type
});

document.getElementById('open-sidebar').addEventListener('click', () => {
    document.getElementById('filter-sidebar').classList.add('show');
});

document.getElementById('close-sidebar').addEventListener('click', () => {
    document.getElementById('filter-sidebar').classList.remove('show');
});