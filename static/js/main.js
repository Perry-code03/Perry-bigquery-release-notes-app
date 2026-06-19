document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseNotes = []; // Raw feed entries
    let parsedNotes = [];  // Structured items split by sub-updates
    let selectedItemId = null;
    let currentFilter = 'all';
    let searchQuery = '';
    
    // SVG Progress Circle configuration
    const circle = document.getElementById('progress-circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const refreshIcon = document.getElementById('refresh-icon');
    const btnRetry = document.getElementById('btn-retry');
    const btnExport = document.getElementById('btn-export');
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const searchInput = document.getElementById('search-input');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const filterChips = document.querySelectorAll('.chip');
    const updateCountText = document.getElementById('update-count');
    
    // States sections
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const timeline = document.getElementById('timeline');
    
    // Composer elements
    const composerEmptyState = document.getElementById('composer-empty-state');
    const composerActiveState = document.getElementById('composer-active-state');
    const selectedDateText = document.getElementById('selected-date-text');
    const selectedTypeBadge = document.getElementById('selected-type-badge');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const btnResetTweet = document.getElementById('btn-reset-tweet');
    const charCountText = document.getElementById('char-count-text');
    const btnCopyTweet = document.getElementById('btn-copy-tweet');
    const btnPostTweet = document.getElementById('btn-post-tweet');
    
    // --- TOAST NOTIFICATIONS ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        lucide.createIcons();
        
        // Slide out and remove after 3s
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    // --- XML HTML PARSING ENGINE ---
    // Splitting Google's feed content into individual updates by H3 tags
    function parseContentHtml(contentHtml, defaultTitle) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(contentHtml || '', 'text/html');
        const children = Array.from(doc.body.childNodes);
        
        const subUpdates = [];
        let currentHeading = null;
        let currentNodes = [];
        
        children.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H3') {
                if (currentHeading || currentNodes.length > 0) {
                    const text = currentNodes.map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
                    const html = currentNodes.map(n => n.outerHTML || n.textContent).join('');
                    subUpdates.push({
                        type: currentHeading ? currentHeading.textContent.trim() : 'General',
                        contentHtml: html,
                        contentText: text
                    });
                }
                currentHeading = node;
                currentNodes = [];
            } else {
                currentNodes.push(node);
            }
        });
        
        // Push the trailing block
        if (currentHeading || currentNodes.length > 0) {
            const text = currentNodes.map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
            const html = currentNodes.map(n => n.outerHTML || n.textContent).join('');
            subUpdates.push({
                type: currentHeading ? currentHeading.textContent.trim() : 'General',
                contentHtml: html,
                contentText: text
            });
        }
        
        // Fallback if no structural blocks were found
        if (subUpdates.length === 0) {
            subUpdates.push({
                type: 'General',
                contentHtml: contentHtml,
                contentText: doc.body.textContent.replace(/\s+/g, ' ').trim()
            });
        }
        
        return subUpdates;
    }

    function getFilterCategory(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return 'feature';
        if (t.includes('change')) return 'change';
        if (t.includes('deprecation')) return 'deprecation';
        if (t.includes('resolved') || t.includes('fix') || t.includes('issue') || t.includes('resolve')) return 'resolved';
        return 'other';
    }

    // --- DATA FETCHING ---
    async function fetchReleaseNotes() {
        // UI Visual Update to Loading State
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        timeline.style.display = 'none';
        btnRefresh.disabled = true;
        refreshIcon.classList.add('spinning');
        updateCountText.textContent = "Fetching updates...";
        
        try {
            const response = await fetch('/api/notes');
            const result = await response.json();
            
            if (result.success) {
                releaseNotes = result.data;
                processAndParseNotes();
                renderTimeline();
                showToast("Release notes synced successfully!", "success");
            } else {
                throw new Error(result.error || "Unknown server error occurred");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            errorMessage.textContent = error.message || "Failed to load release notes feed.";
            loadingState.style.display = 'none';
            errorState.style.display = 'flex';
            showToast("Sync failed. Check connection.", "error");
        } finally {
            btnRefresh.disabled = false;
            refreshIcon.classList.remove('spinning');
        }
    }

    // Processes standard Atom feed and splits compound entries
    function processAndParseNotes() {
        parsedNotes = [];
        
        releaseNotes.forEach((entry, entryIndex) => {
            const subUpdates = parseContentHtml(entry.content, entry.title);
            
            subUpdates.forEach((sub, subIndex) => {
                const uniqueId = `note-${entryIndex}-${subIndex}`;
                const filterCat = getFilterCategory(sub.type);
                
                parsedNotes.push({
                    id: uniqueId,
                    date: entry.title, // 'June 17, 2026'
                    rawDate: entry.updated,
                    link: entry.link,
                    type: sub.type,
                    filterCategory: filterCat,
                    contentHtml: sub.contentHtml,
                    contentText: sub.contentText
                });
            });
        });
    }

    // --- TIMELINE RENDERING ---
    function renderTimeline() {
        timeline.innerHTML = '';
        
        // Filter elements based on query and filter chips
        const filtered = parsedNotes.filter(note => {
            const matchesFilter = currentFilter === 'all' || note.filterCategory === currentFilter;
            const matchesSearch = searchQuery === '' || 
                note.contentText.toLowerCase().includes(searchQuery) ||
                note.type.toLowerCase().includes(searchQuery) ||
                note.date.toLowerCase().includes(searchQuery);
            return matchesFilter && matchesSearch;
        });

        // Hide loading spinner
        loadingState.style.display = 'none';

        if (filtered.length === 0) {
            updateCountText.textContent = "0 updates found";
            emptyState.style.display = 'flex';
            timeline.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        timeline.style.display = 'flex';
        updateCountText.textContent = `Showing ${filtered.length} of ${parsedNotes.length} release updates`;

        // Group by Date
        const groupedByDate = {};
        filtered.forEach(note => {
            if (!groupedByDate[note.date]) {
                groupedByDate[note.date] = [];
            }
            groupedByDate[note.date].push(note);
        });

        // Construct HTML markup
        Object.keys(groupedByDate).forEach(date => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'timeline-group';
            
            const dot = document.createElement('div');
            dot.className = 'timeline-dot';
            groupDiv.appendChild(dot);
            
            const dateHeader = document.createElement('h2');
            dateHeader.className = 'timeline-date';
            dateHeader.textContent = date;
            groupDiv.appendChild(dateHeader);
            
            // Append notes cards for this date
            groupedByDate[date].forEach(note => {
                const card = document.createElement('div');
                card.className = `update-card ${selectedItemId === note.id ? 'selected' : ''}`;
                card.dataset.id = note.id;
                
                const badgeClass = `badge-${note.filterCategory}`;
                
                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-tags">
                            <span class="badge ${badgeClass}">${note.type}</span>
                        </div>
                        <div class="selection-checkbox" aria-label="Select update">
                            <i data-lucide="check"></i>
                        </div>
                    </div>
                    <div class="card-content">
                        ${note.contentHtml}
                    </div>
                    <div class="card-footer">
                        <button class="btn-card-action btn-copy-card" title="Copy update content to clipboard">
                            <i data-lucide="copy"></i>
                            <span>Copy Card</span>
                        </button>
                        <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="card-link" title="Open official GCP documentation">
                            <span>Official Docs</span>
                            <i data-lucide="external-link"></i>
                        </a>
                    </div>
                `;
                
                // Card click event triggers selection
                card.addEventListener('click', (e) => {
                    // Prevent trigger if they click links or buttons directly
                    if (e.target.closest('a') || e.target.closest('button')) return;
                    selectNote(note.id);
                });

                // Copy Card content clipboard handler
                const btnCopyCard = card.querySelector('.btn-copy-card');
                btnCopyCard.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent card selection toggle
                    try {
                        await navigator.clipboard.writeText(note.contentText);
                        showToast("Card text copied to clipboard!", "success");
                        
                        // Temporary visual feedback
                        const iconEl = btnCopyCard.querySelector('i');
                        const textEl = btnCopyCard.querySelector('span');
                        iconEl.setAttribute('data-lucide', 'check');
                        textEl.textContent = 'Copied!';
                        lucide.createIcons();
                        
                        setTimeout(() => {
                            iconEl.setAttribute('data-lucide', 'copy');
                            textEl.textContent = 'Copy Card';
                            lucide.createIcons();
                        }, 1500);
                    } catch (err) {
                        console.error(err);
                        showToast("Failed to copy card text.", "error");
                    }
                });
                
                groupDiv.appendChild(card);
            });
            
            timeline.appendChild(groupDiv);
        });

        // Initialize newly injected Lucide icons
        lucide.createIcons();
    }

    // --- TWEET BUILDER & SELECTION ---
    function selectNote(id) {
        // Toggle or select new
        if (selectedItemId === id) {
            selectedItemId = null;
            updateComposerUI(null);
        } else {
            selectedItemId = id;
            const note = parsedNotes.find(n => n.id === id);
            updateComposerUI(note);
        }
        
        // Rerender timeline cards to apply visual selected state
        document.querySelectorAll('.update-card').forEach(card => {
            if (card.dataset.id === selectedItemId) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    function buildDefaultTweetText(note) {
        if (!note) return '';
        
        // Strip tags/excess spaces from paragraph contents
        let summary = note.contentText;
        
        // Truncate summary to keep URL and context within X (280 chars) limit
        // Template: "BigQuery Update ([date]) [[type]]: [summary] [link] #GCP"
        const prefix = `BigQuery Update (${note.date}) [${note.type}]: `;
        const suffix = `\n\nRead details: ${note.link}`;
        
        // Reserved space = prefix length + suffix length
        const availableLength = 280 - prefix.length - suffix.length - 2; // safety margin
        
        if (summary.length > availableLength) {
            summary = summary.substring(0, availableLength - 3) + '...';
        }
        
        return `${prefix}${summary}${suffix}`;
    }

    function updateComposerUI(note) {
        if (!note) {
            composerEmptyState.style.display = 'flex';
            composerActiveState.style.display = 'none';
            return;
        }
        
        composerEmptyState.style.display = 'none';
        composerActiveState.style.display = 'flex';
        
        selectedDateText.textContent = note.date;
        selectedTypeBadge.textContent = note.type;
        selectedTypeBadge.className = `badge badge-${note.filterCategory}`;
        
        // Generate pre-populated text
        const defaultText = buildDefaultTweetText(note);
        tweetTextarea.value = defaultText;
        
        updateCharCounter();
        lucide.createIcons();
    }

    // --- COMPOSER ENGINE (CHARACTER COUNTER & METRICS) ---
    function updateCharCounter() {
        const text = tweetTextarea.value;
        const len = text.length;
        const limit = 280;
        const remaining = limit - len;
        
        charCountText.textContent = remaining;
        
        // Circular Progress styling
        const percentage = Math.min((len / limit) * 100, 100);
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        // Color coding classes based on length
        charCountText.className = 'char-count-text';
        if (remaining <= 20 && remaining >= 0) {
            charCountText.classList.add('warn');
            circle.style.stroke = '#f59e0b'; // Amber warning
        } else if (remaining < 0) {
            charCountText.classList.add('danger');
            circle.style.stroke = '#ef4444'; // Red danger
        } else {
            circle.style.stroke = '#1d9bf0'; // Standard Twitter blue
        }
    }

    // --- INTERACTIVE EVENT LISTENERS ---
    
    // Live typing character updates
    tweetTextarea.addEventListener('input', updateCharCounter);
    
    // Reset tweet to default text
    btnResetTweet.addEventListener('click', () => {
        const note = parsedNotes.find(n => n.id === selectedItemId);
        if (note) {
            tweetTextarea.value = buildDefaultTweetText(note);
            updateCharCounter();
            showToast("Reverted tweet text to original summary", "success");
        }
    });

    // Copy to clipboard with navigator API
    btnCopyTweet.addEventListener('click', async () => {
        const text = tweetTextarea.value;
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied to clipboard!", "success");
        } catch (err) {
            console.error("Clipboard copy failed: ", err);
            showToast("Failed to copy text.", "error");
        }
    });

    // Post to Twitter (opens Web Intent link)
    btnPostTweet.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    });

    // --- CSV EXPORTER ---
    function exportToCSV() {
        const filtered = parsedNotes.filter(note => {
            const matchesFilter = currentFilter === 'all' || note.filterCategory === currentFilter;
            const matchesSearch = searchQuery === '' || 
                note.contentText.toLowerCase().includes(searchQuery) ||
                note.type.toLowerCase().includes(searchQuery) ||
                note.date.toLowerCase().includes(searchQuery);
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            showToast("No release notes found to export.", "error");
            return;
        }

        const headers = ["Date", "Update Type", "Category", "Content", "Source Link"];
        const rows = filtered.map(note => [
            note.date,
            note.type,
            note.filterCategory,
            note.contentText,
            note.link
        ]);

        const formatField = field => {
            const value = (field === null || field === undefined) ? '' : String(field);
            return `"${value.replace(/"/g, '""')}"`;
        };

        const csvContent = [
            headers.map(formatField).join(','),
            ...rows.map(row => row.map(formatField).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        
        let filename = 'bigquery_release_notes';
        if (currentFilter !== 'all') {
            filename += `_${currentFilter}`;
        }
        if (searchQuery) {
            filename += `_search`;
        }
        filename += '.csv';

        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${filtered.length} notes to CSV!`, "success");
    }

    // Theme Toggle Handler
    function initTheme() {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        if (currentTheme === 'light') {
            document.body.classList.add('light-theme');
            themeIcon.setAttribute('data-lucide', 'sun');
        } else {
            document.body.classList.remove('light-theme');
            themeIcon.setAttribute('data-lucide', 'moon');
        }
    }

    btnThemeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        if (isLight) {
            localStorage.setItem('theme', 'light');
            themeIcon.setAttribute('data-lucide', 'sun');
            showToast("Switched to Light Mode", "success");
        } else {
            localStorage.setItem('theme', 'dark');
            themeIcon.setAttribute('data-lucide', 'moon');
            showToast("Switched to Dark Mode", "success");
        }
        lucide.createIcons();
    });

    // Refresh control
    btnRefresh.addEventListener('click', fetchReleaseNotes);
    btnRetry.addEventListener('click', fetchReleaseNotes);
    
    // Export CSV control
    btnExport.addEventListener('click', exportToCSV);

    // Fuzzy search controller
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        btnClearSearch.style.display = searchQuery ? 'block' : 'none';
        renderTimeline();
    });

    // Clear search trigger
    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        renderTimeline();
        searchInput.focus();
    });

    // Filter Chips selection
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            renderTimeline();
        });
    });

    // --- BOOTSTRAP INIT ---
    initTheme();
    fetchReleaseNotes();
});
