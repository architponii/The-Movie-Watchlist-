const API_KEY = "9f275941bf89c0fdfa2a7f16ecc2a043";

// --- State Management ---
let allMovies = [];
let currentPage = 1;
// Initialize favorites from Local Storage, using an Array
let favorites = JSON.parse(localStorage.getItem('movieFavorites')) || [];

// --- DOM Elements ---
const moviesContainer = document.getElementById('movies');
const searchInput = document.getElementById('searchInput');
const filterRating = document.getElementById('filterRating');
const sortMovies = document.getElementById('sortMovies');
const loadingIndicator = document.getElementById('loading');
const themeToggleBtn = document.getElementById('themeToggle');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreContainer = document.getElementById('loadMoreContainer');

// --- Initialization ---
function init() {
    // Check Theme Preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        themeToggleBtn.textContent = '🌙';
    } else {
        document.body.classList.add('dark-mode');
        themeToggleBtn.textContent = '☀️';
    }

    // Fetch initial movies
    fetchMovies(currentPage);
}

// --- API calls ---
async function fetchMovies(page = 1) {
    showLoading(true);
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&page=${page}`);
        const data = await response.json();
        
        if (page === 1) {
            allMovies = data.results;
        } else {
            // Append new array data (spread operator)
            allMovies = [...allMovies, ...data.results];
        }
        
        applyFiltersAndRender();
        if (data.results.length > 0) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error fetching movies: ", error);
        moviesContainer.innerHTML = `<p style="text-align:center;width:100%;grid-column: 1 / -1;">Failed to load movies. Please check your internet connection.</p>`;
    } finally {
        showLoading(false);
    }
}

// --- Higher Order Array Methods for Features ---

function applyFiltersAndRender() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterVal = filterRating.value;
    const sortVal = sortMovies.value;

    // 1. FILTERING & SEARCHING (Array.filter)
    let processedMovies = allMovies.filter(movie => {
        // Search by Keyword
        const matchesSearch = movie.title.toLowerCase().includes(searchTerm);
        
        // Filter by specific criteria
        let matchesFilter = true;
        if (filterVal === 'favorite') {
             matchesFilter = favorites.includes(movie.id);
        } else if (filterVal !== '0') {
            matchesFilter = movie.vote_average >= parseFloat(filterVal);
        }
        
        return matchesSearch && matchesFilter;
    });

    // 2. SORTING (Array.sort)
    processedMovies.sort((a, b) => {
        if (sortVal === 'ratingDesc') return b.vote_average - a.vote_average;
        if (sortVal === 'ratingAsc') return a.vote_average - b.vote_average;
        if (sortVal === 'titleAsc') return a.title.localeCompare(b.title);
        if (sortVal === 'titleDesc') return b.title.localeCompare(a.title);
        return 0; // default order based on API
    });

    // 3. RENDERING (Array.map + Array.join)
    renderMovies(processedMovies);
}

function renderMovies(moviesArray) {
    if (moviesArray.length === 0) {
        moviesContainer.innerHTML = `<p style="text-align:center;width:100%;grid-column: 1 / -1;padding: 3rem;font-size:1.2rem;opacity:0.8;">No movies found 😢</p>`;
        return;
    }

    // Using Array.map to generate HTML strings
    const htmlString = moviesArray.map(movie => {
        const isFavorite = favorites.includes(movie.id);
        const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
        
        return `
            <div class="movie-card">
                <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" loading="lazy">
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <div class="movie-meta">
                        <span>⭐ ${movie.vote_average.toFixed(1)}</span>
                    </div>
                    <button class="btn-watchlist ${isFavorite ? 'active' : ''}" data-id="${movie.id}">
                        ${isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
                    </button>
                </div>
            </div>
        `;
    }).join(""); 
    
    // Set innerHTML (batch update is much more performant than appending individually)
    moviesContainer.innerHTML = htmlString;
    
    // Attach event listeners to favorite buttons after rendering
    attachFavoriteEvents();
}

// --- Utilities ---

function showLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        if (currentPage === 1) moviesContainer.innerHTML = ''; 
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

// DEBOUNCING: limits frequency of search execution
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Custom handling for favorite clicks
function attachFavoriteEvents() {
    const favButtons = document.querySelectorAll('.btn-watchlist');
    favButtons.forEach(btn => {
        // Remove old listeners to prevent duplication if re-rendered
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            // Prevent event from bubbling if card link is added later
            e.stopPropagation(); 
            const movieId = parseInt(e.currentTarget.getAttribute('data-id'));
            toggleFavorite(movieId);
        });
    });
}

function toggleFavorite(id) {
    if (favorites.includes(id)) {
        // Remove from favorites using Array.filter
        favorites = favorites.filter(favId => favId !== id);
    } else {
        // Add to favorites
        favorites.push(id);
    }
    
    // Save to Local Storage
    localStorage.setItem('movieFavorites', JSON.stringify(favorites));
    
    // Re-render UI
    applyFiltersAndRender();
}

// --- Event Listeners ---

// Theme Toggle
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.textContent = '☀️';
    } else {
        localStorage.setItem('theme', 'light');
        themeToggleBtn.textContent = '🌙';
    }
});

// Search Input with Debounce (Wait 500ms before filtering)
const debouncedSearch = debounce(() => {
    applyFiltersAndRender();
}, 500);

searchInput.addEventListener('input', debouncedSearch);

// Filter & Sort Logic
filterRating.addEventListener('change', applyFiltersAndRender);
sortMovies.addEventListener('change', applyFiltersAndRender);

// Load More Button
loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    fetchMovies(currentPage);
});

// Start application
init();