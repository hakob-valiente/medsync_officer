// Content Generation Service
// Orchestrates news fetching + AI generation for health content

import { fetchHealthNews, extractHealthTopics } from './news.service.js';
import { generateHealthAdvisory, analyzeTrends, generateHealthTrivia } from './ai.service.js';
import { contentStore } from '../storage/memory.store.js';

/**
 * Generate all health content
 * Called when frontend triggers POST /api/refresh
 */
export async function generateAllContent() {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 STARTING CONTENT GENERATION');
    console.log('='.repeat(70) + '\n');

    const results = {
        advisories: 0,
        trends: 0,
        trivia: false,
        errors: []
    };

    try {
        // Step 1: Fetch Philippine health news FIRST (before clearing)
        console.log('📝 STEP 1: Fetching Philippine health news...');
        const newsArticles = await fetchHealthNews(15);

        if (newsArticles.length === 0) {
            console.warn('\n⚠️  No news articles found');
            console.warn('📦 KEEPING existing content in memory - NOT clearing');
            console.warn('   Dashboard will show previous advisories/trends/trivia\n');

            // Check if we have existing content
            const currentAdvisories = contentStore.getAdvisories();
            const currentTrends = contentStore.getTrends();
            const currentTrivia = contentStore.getTrivia();

            if (currentAdvisories.length > 0 || currentTrends.length > 0 || currentTrivia !== null) {
                // We have existing content, keep it
                results.advisories = currentAdvisories.length;
                results.trends = currentTrends.length;
                results.trivia = currentTrivia !== null;
                results.errors.push('No new articles - kept previous content');
                return results;
            } else {
                // No existing content, generate fallback content
                console.log('🔄 No existing content found, generating fallback content...\n');
                
                // Generate fallback advisories
                const fallbackAdvisories = [
                    {
                        id: `adv-fallback-${Date.now()}-1`,
                        title: 'Understanding and Preparing for the Super Flu Season',
                        summary: 'The rise of the super flu strain may extend the flu season and strain the healthcare system, prompting a need for vigilance and preventive measures. ⚠️ This is educational information only. Consult healthcare professionals for proper diagnosis and treatment.',
                        category: 'Respiratory',
                        riskLevel: 'MEDIUM',
                        healthConcerns: ['Respiratory symptoms', 'Fever and elevated body temperature', 'Fatigue and weakness'],
                        preventiveActions: ['Practice good hygiene and hand washing', 'Get vaccinated against influenza', 'Stay hydrated and maintain a balanced diet'],
                        whenToSeekHelp: ['If symptoms persist for more than 3 days', 'If you experience severe symptoms', 'For regular health check-ups'],
                        sourceUrl: 'https://www.who.int/philippines',
                        publishedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        fullContent: `
                            <h3>Health Concerns</h3>
                            <ul>
                                <li>Respiratory symptoms</li>
                                <li>Fever and elevated body temperature</li>
                                <li>Fatigue and weakness</li>
                            </ul>
                            
                            <h3>Preventive Actions</h3>
                            <ul>
                                <li>Practice good hygiene and hand washing</li>
                                <li>Get vaccinated against influenza</li>
                                <li>Stay hydrated and maintain a balanced diet</li>
                            </ul>
                            
                            <h3>When to Seek Medical Help</h3>
                            <ul>
                                <li>If symptoms persist for more than 3 days</li>
                                <li>If you experience severe symptoms</li>
                                <li>For regular health check-ups and consultations</li>
                            </ul>
                            
                            <p><small>Source: <a href="https://www.who.int/philippines" target="_blank">WHO Philippines</a></small></p>
                        `
                    },
                    {
                        id: `adv-fallback-${Date.now()}-2`,
                        title: 'Protecting Against Influenza-Like Illnesses in the Elderly',
                        summary: 'Influenza-like illnesses pose a significant health risk, particularly to the elderly. It is essential to take preventive measures to reduce the risk of transmission. ⚠️ This is educational information only. Consult healthcare professionals for proper diagnosis and treatment.',
                        category: 'Infectious Disease',
                        riskLevel: 'HIGH',
                        healthConcerns: ['Severe respiratory complications', 'Hospitalization risks', 'Secondary infections'],
                        preventiveActions: ['Annual flu vaccination', 'Avoid close contact with sick individuals', 'Practice respiratory hygiene'],
                        whenToSeekHelp: ['If symptoms appear', 'For elderly family members', 'When experiencing breathing difficulties'],
                        sourceUrl: 'https://doh.gov.ph/',
                        publishedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        fullContent: `
                            <h3>Health Concerns</h3>
                            <ul>
                                <li>Severe respiratory complications</li>
                                <li>Hospitalization risks</li>
                                <li>Secondary infections</li>
                            </ul>
                            
                            <h3>Preventive Actions</h3>
                            <ul>
                                <li>Annual flu vaccination</li>
                                <li>Avoid close contact with sick individuals</li>
                                <li>Practice respiratory hygiene</li>
                            </ul>
                            
                            <h3>When to Seek Medical Help</h3>
                            <ul>
                                <li>If symptoms appear</li>
                                <li>For elderly family members</li>
                                <li>When experiencing breathing difficulties</li>
                            </ul>
                            
                            <p><small>Source: <a href="https://doh.gov.ph/" target="_blank">Philippine DOH</a></small></p>
                        `
                    }
                ];
                contentStore.setAdvisories(fallbackAdvisories);
                results.advisories = fallbackAdvisories.length;
                
                // Generate fallback trends
                const fallbackTrends = [
                    {
                        id: `trend-fallback-${Date.now()}-1`,
                        title: 'Influenza Activity',
                        riskLevel: 'MEDIUM',
                        description: 'Influenza viruses continue to circulate. Seasonal flu activity may increase during cooler months. Stay updated with health advisories.',
                        category: 'Public Health',
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: `trend-fallback-${Date.now()}-2`,
                        title: 'COVID-19 Monitoring',
                        riskLevel: 'LOW',
                        description: 'COVID-19 remains under monitoring. Vaccination and preventive measures continue to be important.',
                        category: 'Public Health',
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: `trend-fallback-${Date.now()}-3`,
                        title: 'Mental Health Awareness',
                        riskLevel: 'MEDIUM',
                        description: 'Mental health concerns continue to be a focus. Access to mental health services and support is crucial.',
                        category: 'Public Health',
                        updatedAt: new Date().toISOString()
                    }
                ];
                contentStore.setTrends(fallbackTrends);
                results.trends = fallbackTrends.length;
                
                // Generate fallback trivia
                const fallbackTrivia = {
                    id: `trivia-fallback-${Date.now()}`,
                    question: "Did you know? Regular hand washing can reduce respiratory infections by up to 23%?",
                    answer: "Proper hand hygiene is one of the most effective ways to prevent the spread of infectious diseases. Washing hands with soap and water for at least 20 seconds helps remove germs and reduces the risk of illnesses like flu and colds.",
                    reference: {
                        text: "CDC",
                        url: "https://www.cdc.gov/"
                    },
                    date: new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString()
                };
                contentStore.setTrivia(fallbackTrivia);
                results.trivia = true;
                
                results.errors.push('No articles found - generated fallback content');
                return results;
            }
        }

        console.log(`✅ Found ${newsArticles.length} relevant articles`);
        console.log('🗑️  Clearing old content to make room for new data\n');

        // Step 2: Clear ONLY if we have new articles
        console.log('📝 STEP 2: Clearing existing content...');
        contentStore.clearAll();
        console.log('✅ Content cleared\n');

        // Step 3: Generate advisories from articles
        console.log('📝 STEP 3: Generating health advisories...');
        const advisories = [];
        let processedCount = 0;
        let errorCount = 0;

        for (const article of newsArticles) {
            try {
                processedCount++;
                console.log(`  [${processedCount}/${newsArticles.length}] Processing: "${article.title.substring(0, 60)}..."`);

                const advisory = await generateHealthAdvisory(article);

                if (advisory) {
                    // Map AI response to frontend-expected schema
                    const normalizedAdvisory = {
                        id: `adv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        title: advisory.title || article.title || 'Health Advisory',
                        summary: advisory.summary || article.description || 'No summary available',
                        category: advisory.category || 'General Health',

                        // Map priority to riskLevel (frontend expects riskLevel)
                        riskLevel: (advisory.priority === 'high' ? 'HIGH' :
                            advisory.priority === 'medium' ? 'MEDIUM' : 'LOW'),

                        // Map AI field names to frontend field names
                        healthConcerns: Array.isArray(advisory.possibleHealthConcerns)
                            ? advisory.possibleHealthConcerns
                            : [],
                        preventiveActions: Array.isArray(advisory.preventiveActions)
                            ? advisory.preventiveActions
                            : [],
                        whenToSeekHelp: Array.isArray(advisory.whenToVisitClinic)
                            ? advisory.whenToVisitClinic
                            : ['Consult a healthcare professional if symptoms persist'],

                        sourceUrl: article.url || '',
                        publishedAt: article.publishedAt || new Date().toISOString(),
                        createdAt: new Date().toISOString(),

                        // Full content for Read More modal
                        fullContent: advisory.fullContent || `
                            <h3>Health Concerns</h3>
                            <ul>${(advisory.possibleHealthConcerns || []).map(c => `<li>${c}</li>`).join('') || '<li>No specific concerns listed</li>'}</ul>
                            
                            <h3>Preventive Actions</h3>
                            <ul>${(advisory.preventiveActions || []).map(a => `<li>${a}</li>`).join('') || '<li>Follow general health guidelines</li>'}</ul>
                            
                            <h3>When to Seek Medical Help</h3>
                            <ul>${(advisory.whenToVisitClinic || []).map(w => `<li>${w}</li>`).join('') || '<li>Consult a healthcare professional if symptoms persist</li>'}</ul>
                            
                            <p><small>Source: <a href="${article.url}" target="_blank">${article.source?.name || 'View Article'}</a></small></p>
                        `
                    };

                    advisories.push(normalizedAdvisory);
                    console.log(`  ✅ Generated advisory`);
                } else {
                    errorCount++;
                    console.warn(`  ⚠️  AI returned null`);
                }

                // Rate limiting: wait 1s between calls
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                errorCount++;
                console.error(`  ❌ Error:`, error.message);
            }
        }

        contentStore.setAdvisories(advisories);
        results.advisories = advisories.length;
        console.log(`\n✅ Generated ${advisories.length} advisories (${errorCount} errors)\n`);

        // Step 4: Generate trends from topics
        console.log('📝 STEP 4: Analyzing health trends...');
        const topicCounts = extractHealthTopics(newsArticles);

        if (Object.keys(topicCounts).length > 0) {
            const trendsData = await analyzeTrends(topicCounts);

            // Normalize trends to frontend schema
            const normalizedTrends = trendsData.map((trend, index) => ({
                id: `trend-${Date.now()}-${index}`,
                title: trend.topic || 'Health Trend',
                riskLevel: trend.level === 'High Alert' ? 'HIGH' :
                    trend.level === 'Elevated' ? 'MEDIUM' :
                        trend.level === 'Moderate' ? 'MEDIUM' : 'LOW',
                description: trend.explanation || 'No details available',
                category: 'Public Health',
                updatedAt: new Date().toISOString()
            }));

            contentStore.setTrends(normalizedTrends);
            results.trends = normalizedTrends.length;
            console.log(`✅ Generated ${normalizedTrends.length} trends\n`);
        } else {
            console.warn('⚠️  No topics to analyze\n');
        }

        // Step 5: Generate daily trivia
        console.log('📝 STEP 5: Generating daily trivia...');
        const trivia = await generateHealthTrivia();

        if (trivia) {
            trivia.id = `trivia-${Date.now()}`;
            trivia.date = new Date().toISOString().split('T')[0];
            trivia.createdAt = new Date().toISOString();

            contentStore.setTrivia(trivia);
            results.trivia = true;
            console.log(`✅ Generated trivia\n`);
        } else {
            console.warn('⚠️  Trivia generation failed\n');
        }

        // Save refresh timestamp
        contentStore.setLastRefresh(new Date().toISOString());

        console.log('='.repeat(70));
        console.log('✅ CONTENT GENERATION COMPLETE');
        console.log(`📊 Advisories: ${results.advisories} | Trends: ${results.trends} | Trivia: ${results.trivia}`);
        console.log('='.repeat(70) + '\n');

        return results;

    } catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('❌ CONTENT GENERATION ERROR');
        console.error('='.repeat(70));
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(70) + '\n');

        results.errors.push(error.message);
        throw error;
    }
}
