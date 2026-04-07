// NewsData.io API Service - Server-side
// Fetches Philippine health-related news from NewsData.io

import fetch from 'node-fetch';

const NEWSDATA_BASE_URL = 'https://newsdata.io/api/1/news';

/**
 * Fetch health-related news from Philippines via NewsData.io
 * @param {number} maxArticles - Maximum number of articles to return
 * @returns {Promise<Array>} - Array of normalized news articles
 */
export async function fetchHealthNews(maxArticles = 10) {
    // Access env var INSIDE function (after dotenv has loaded)
    const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;

    // Runtime proof log
    console.log('🔑 NEWSDATA_API_KEY runtime check:', Boolean(NEWSDATA_API_KEY));

    if (!NEWSDATA_API_KEY) {
        console.error('❌ CRITICAL: NEWSDATA_API_KEY is not available at runtime');
        console.error('   Check that dotenv.config() runs BEFORE importing this module');
        throw new Error('NEWSDATA_API_KEY not configured - cannot fetch news');
    }

    console.log('🗞️  Fetching Philippine health news from NewsData.io...');

    try {
        // Health-focused keywords for Philippines
        const healthKeywords = [
            'flu',
            'dengue',
            'respiratory',
            'covid',
            'disease',
            'outbreak',
            'vaccination'
        ];

        const requiredLocations = [
            'Metro Manila',
            'Valenzuela'
        ];

        const allArticles = [];
        const seenUrls = new Set();

        const queryArray = healthKeywords.flatMap(health => 
            requiredLocations.map(location => `${health} ${location}`)
        );
        
        const queryString = '(epidemic OR flu OR contagion OR infection OR health) AND ("Metro Manila" OR Philippines)';

        const match = queryString.match(/\(([^)]+)\)/);

        const displayKeywords = match ? match[1].replace(/ OR /g, ', ') : "health threats";

        console.log(`📰 Fetching health news with keywords: ${displayKeywords}...`);

        try {
            const params = new URLSearchParams({
                apikey: NEWSDATA_API_KEY,
                qInMeta: queryString,
                category: 'health',
                country: 'ph',
                language: 'en,tl',
                size: '10' // NewsData.io free tier max per request
            });

            const response = await fetch(`${NEWSDATA_BASE_URL}?${params}`);

            if (response.ok) {
                const data = await response.json();

                if (data.status === 'success' && data.results && data.results.length > 0) {
                    console.log(`  ✅ Received ${data.results.length} articles from NewsData.io`);

                    // Normalize NewsData.io format to internal format
                    for (const article of data.results) {
                        const normalizedUrl = article.link || article.source_url || '';

                        if (!seenUrls.has(normalizedUrl) && normalizedUrl) {
                            seenUrls.add(normalizedUrl);

                            // Map NewsData.io fields to internal format
                            allArticles.push({
                                title: article.title || 'Untitled',
                                description: article.description || '',
                                content: article.content || article.description || '',
                                url: normalizedUrl,
                                publishedAt: normalizeDate(article.pubDate),
                                source: {
                                    name: article.source_name || 'Unknown Source',
                                    url: article.source_url || ''
                                },
                                image: article.image_url || null,
                                category: article.category ? article.category[0] : 'health'
                            });
                        }
                    }

                    // If we have pagination and need more articles, fetch next page
                    if (data.nextPage && allArticles.length < maxArticles) {
                        console.log(`  📄 Fetching additional page...`);

                        const nextParams = new URLSearchParams({
                            apikey: NEWSDATA_API_KEY,
                            qInMeta: queryString,
                            category: 'health',
                            country: 'ph',
                            language: 'en,tl',
                            size: '10',
                            page: data.nextPage
                        });

                        // Rate limit delay
                        await new Promise(resolve => setTimeout(resolve, 500));

                        const nextResponse = await fetch(`${NEWSDATA_BASE_URL}?${nextParams}`);

                        if (nextResponse.ok) {
                            const nextData = await nextResponse.json();

                            if (nextData.status === 'success' && nextData.results) {
                                for (const article of nextData.results) {
                                    const normalizedUrl = article.link || article.source_url || '';

                                    if (!seenUrls.has(normalizedUrl) && normalizedUrl) {
                                        seenUrls.add(normalizedUrl);

                                        allArticles.push({
                                            title: article.title || 'Untitled',
                                            description: article.description || '',
                                            content: article.content || article.description || '',
                                            url: normalizedUrl,
                                            publishedAt: normalizeDate(article.pubDate),
                                            source: {
                                                name: article.source_name || 'Unknown Source',
                                                url: article.source_url || ''
                                            },
                                            image: article.image_url || null,
                                            category: article.category ? article.category[0] : 'health'
                                        });
                                    }
                                }
                                console.log(`  ✅ Fetched ${nextData.results.length} more articles`);
                            }
                        }
                    }
                } else {
                    console.warn('  ⚠️  NewsData.io returned no results or error status');
                    if (data.message) {
                        console.warn(`     Message: ${data.message}`);
                    }
                }
            } else {
                const errorText = await response.text();
                console.error(`  ❌ NewsData.io API error: ${response.status}`);
                console.error(`     Response: ${errorText.substring(0, 200)}`);

                // Handle rate limiting specifically
                if (response.status === 429) {
                    console.error('  ⚠️  Rate limit exceeded. Try again later.');
                }
            }
        } catch (error) {
            console.error(`  ❌ Fetch error:`, error.message);
        }

        if (allArticles.length === 0) {
            console.warn('⚠️  No articles found from NewsData.io');
            return [];
        }

        // Sort by date (most recent first)
        const sortedArticles = allArticles.sort((a, b) => {
            const dateA = new Date(a.publishedAt);
            const dateB = new Date(b.publishedAt);
            return dateB - dateA;
        });

        // Cap at maxArticles
        const finalArticles = sortedArticles.slice(0, maxArticles);

        console.log(`\n✅ Total unique articles: ${allArticles.length}`);
        console.log(`📋 Returning top ${finalArticles.length} most recent\n`);

        return finalArticles;

    } catch (error) {
        console.error('❌ Error fetching health news:', error.message);
        return [];
    }
}

/**
 * Normalize date from NewsData.io format to ISO string
 * NewsData.io uses: "2026-02-07 12:00:00"
 * We need: "2026-02-07T12:00:00Z"
 */
function normalizeDate(dateString) {
    if (!dateString) {
        return new Date().toISOString();
    }

    try {
        // NewsData.io format: "2026-02-07 12:00:00"
        // Replace space with T and add Z for UTC
        const normalized = dateString.replace(' ', 'T') + 'Z';
        const date = new Date(normalized);

        if (isNaN(date.getTime())) {
            // Fallback: try parsing as-is
            const fallbackDate = new Date(dateString);
            return isNaN(fallbackDate.getTime()) ? new Date().toISOString() : fallbackDate.toISOString();
        }

        return date.toISOString();
    } catch {
        return new Date().toISOString();
    }
}

/**
 * Filter articles for health relevance
 */
function filterHealthRelevantNews(articles) {
    console.log(`\n📋 Filtering ${articles.length} articles...`);

    const healthKeywords = [
        'health', 'disease', 'outbreak', 'virus', 'infection', 'illness', 'sick',
        'dengue', 'flu', 'fever', 'symptoms', 'prevention', 'treatment', 'patient',
        'vaccination', 'vaccine', 'medical', 'clinic', 'hospital', 'doctor',
        'mental', 'wellness', 'nutrition', 'heat', 'DOH', 'WHO', 'advisory',
        'food safety', 'air quality', 'pollution', 'warning', 'alert', 'respiratory'
    ];

    const filtered = articles.filter(article => {
        const text = `${article.title} ${article.description || ''}`.toLowerCase();
        return healthKeywords.some(keyword => text.includes(keyword));
    });

    console.log(`✅ Kept ${filtered.length} of ${articles.length} articles\n`);
    return filtered;
}

/**
 * Extract health topics from articles
 */
export function extractHealthTopics(articles) {
    console.log(`🔍 Extracting health topics from ${articles.length} articles...`);

    const topicKeywords = {
        'Dengue': ['dengue', 'mosquito', 'aedes'],
        'COVID-19': ['covid', 'coronavirus', 'pandemic', 'sars-cov'],
        'Flu': ['influenza', 'flu', 'h1n1', 'h3n2'],
        'Heat-Related': ['heat', 'heat index', 'heat stroke', 'dehydration'],
        'Air Quality': ['air quality', 'pollution', 'smog', 'pm2.5'],
        'Mental Health': ['mental health', 'stress', 'anxiety', 'depression', 'wellness'],
        'Food Safety': ['food', 'food poisoning', 'contamination', 'salmonella'],
        'Vaccination': ['vaccine', 'vaccination', 'immunization'],
        'Respiratory': ['respiratory', 'breathing', 'lung', 'pneumonia', 'bronchitis']
    };

    const topicCounts = {};

    articles.forEach(article => {
        const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();

        Object.keys(topicKeywords).forEach(topic => {
            const keywords = topicKeywords[topic];
            if (keywords.some(keyword => text.includes(keyword))) {
                topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
        });
    });

    console.log('📊 Topic distribution:', topicCounts);
    return topicCounts;
}
