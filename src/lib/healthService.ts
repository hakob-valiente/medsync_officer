import type { HealthAdvisory } from '../types';

const NEWSDATA_BASE_URL = 'https://newsdata.io/api/1/latest';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Helper to get environment variables reliably in Vite
const getEnv = (key: string) => {
    return (import.meta as any).env[key] || '';
};

export async function fetchAndProcessHealthNews(): Promise<HealthAdvisory[]> {
    console.log('🗞️ Fetching health news...');

    try {
        const newsArticles = await fetchHealthNews(); // Fetch more to allow for filtering

        if (newsArticles.length === 0) {
            console.warn('⚠️ No news articles found.');
            return [];
        }

        const advisories: HealthAdvisory[] = [];

        // Process top articles, cap at 6 advisories
        for (const article of newsArticles) {
            if (advisories.length >= 6) break;

            try {
                const advisoryData = await generateHealthAdvisory(article);
                console.log(advisoryData);
                if (advisoryData) {
                    const normalized: HealthAdvisory = {
                        id: `adv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        title: advisoryData.title || article.title || 'Health Advisory',
                        summary: advisoryData.summary || article.description || 'No summary available',
                        category: advisoryData.category || 'Public Health',
                        riskLevel: (advisoryData.priority === 'high' ? 'HIGH' :
                            advisoryData.priority === 'medium' ? 'MEDIUM' : 'LOW'),
                        healthConcerns: advisoryData.possibleHealthConcerns || [],
                        preventiveActions: advisoryData.preventiveActions || [],
                        whenToSeekHelp: advisoryData.whenToVisitClinic || ['Consult a healthcare professional if symptoms persist'],
                        sourceUrl: article.link || article.url || 'https://doh.gov.ph',
                        publishedAt: article.pubDate || new Date().toISOString(),
                        oneSentenceSummary: (advisoryData.oneSentenceSummary && advisoryData.oneSentenceSummary.length > 5)
                            ? advisoryData.oneSentenceSummary
                            : advisoryData.title || (advisoryData.summary?.split('.')[0] + '.'),
                        fullContent: advisoryData.fullContent || `
                            <div class="space-y-6">
                                <div class="bg-blue-50/80 p-5 rounded-2xl border border-blue-100 shadow-sm">
                                    <h4 class="font-bold text-blue-900 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <div class="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                                        Detailed Health Insight
                                    </h4>
                                    <p class="text-[15px] text-slate-800 leading-relaxed font-medium">
                                        ${advisoryData.summary}
                                    </p>
                                </div>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div class="space-y-6">
                                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                            <h4 class="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <div class="w-2 h-2 rounded-full bg-red-500 shadow-sm"></div>
                                                Medical Risks & Concerns
                                            </h4>
                                            <ul class="space-y-2.5">
                                                ${(advisoryData.possibleHealthConcerns || []).map((c: string) => `
                                                    <li class="flex items-start gap-3 text-sm text-slate-600">
                                                        <span class="text-red-400 mt-1 font-bold">!</span>
                                                        ${c}
                                                    </li>
                                                `).join('') || '<li class="text-slate-400 italic">No specific risks identified</li>'}
                                            </ul>
                                        </div>
                                        
                                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                            <h4 class="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <div class="w-2 h-2 rounded-full bg-amber-500 shadow-sm"></div>
                                                Indicator Checklist
                                            </h4>
                                            <ul class="space-y-2.5">
                                                ${(advisoryData.whenToVisitClinic || []).map((w: string) => `
                                                    <li class="flex items-start gap-3 text-sm text-slate-600">
                                                        <span class="text-amber-500 mt-1 font-bold">?</span>
                                                        ${w}
                                                    </li>
                                                `).join('') || '<li class="text-slate-400 italic">Consult professional if symptoms persist</li>'}
                                            </ul>
                                        </div>
                                    </div>

                                    <div class="bg-green-50/30 p-5 rounded-2xl border border-green-100 shadow-sm h-full">
                                        <h4 class="font-bold text-green-900 text-[10px] uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <div class="w-2 h-2 rounded-full bg-green-500 shadow-sm"></div>
                                            Preventive Action Plan
                                        </h4>
                                        <ul class="space-y-3">
                                            ${(advisoryData.preventiveActions || []).map((a: string) => `
                                                <li class="flex items-start gap-3 text-sm text-slate-700 font-semibold bg-white/50 p-2 rounded-lg border border-white/80">
                                                    <div class="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-[10px] shrink-0">✓</div>
                                                    ${a}
                                                </li>
                                            `).join('') || '<li class="text-slate-400 italic text-sm">Observe standard health hygiene</li>'}
                                        </ul>
                                    </div>
                                </div>

                                <div class="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
                                        </div>
                                        <div class="flex flex-col">
                                            <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">Validated Source</span>
                                            <span class="text-sm font-bold text-slate-700">${article.source_id?.toUpperCase() || 'OFFICIAL REPORT'}</span>
                                        </div>
                                    </div>
                                    <a href="${article.link || article.url}" target="_blank" class="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 group">
                                        Read Full Article
                                        <svg class="group-hover:translate-x-1 transition-transform" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                                    </a>
                                </div>
                            </div>
                        `
                    };
                    advisories.push(normalized);
                }
            } catch (err) {
                console.error('Error processing article:', err);
            }
        }

        return advisories;
    } catch (error) {
        console.error('Health service error:', error);
        return [];
    }
}

async function fetchHealthNews() {
    const NEWSDATA_API_KEY = getEnv('VITE_NEWSDATA_API_KEY');
    if (!NEWSDATA_API_KEY) {
        console.error('NEWSDATA_API_KEY not configured');
        return [];
    }

    const queryString = '(epidemic OR flu OR contagion OR infection OR health) AND ("Metro Manila" OR Philippines)';
    const params = new URLSearchParams({
        apikey: NEWSDATA_API_KEY,
        qInMeta: queryString,
        category: 'health',
        country: 'ph',
        language: 'en,tl'
    });

    try {
        const response = await fetch(`${NEWSDATA_BASE_URL}?${params}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.results || [];
    } catch {
        return [];
    }
}

async function generateHealthAdvisory(newsArticle: any): Promise<any> {
    const GROQ_API_KEY = getEnv('VITE_GROQ_API_KEY');
    if (!GROQ_API_KEY) {
        return null;
    }

    const prompt = `You are a health education AI for a Philippine university health portal. 
Analyze the following news article for its location and health relevance.
Generate an EDUCATIONAL health advisory from this news.

CRITICAL INSTRUCTION:
If the news article does NOT describe news occurring in the Philippines or Metro Manila, 
you must return an empty JSON object {} and nothing else.

News Article:
Title: ${newsArticle.title}
Content: ${newsArticle.description || newsArticle.content || ''}
Source: ${newsArticle.source_id || 'News'}

If it IS relevant to the Philippines/Metro Manila, generate JSON with this EXACT structure. ALL FIELDS ARE MANDATORY. 
Ensure "oneSentenceSummary" is a high-quality, impactful sentence different from the summary.

{
  "title": "Clear, specific educational title",
  "priority": "high" | "medium" | "low",
  "category": "Infectious Disease" | "Respiratory" | "Mental Health" | "Nutrition" | "Environmental Health" | "Chronic Disease" | "Public Health",
  "summary": "Provide a comprehensive yet concise educational summary of approximately eighty words based on the provided news article. Your response must clearly explain the current health context, highlight specific findings mentioned in the news, and offer detailed, actionable guidance for the community. Please ensure that you incorporate as much specific detail as possible from the source text while strictly adhering to the specified word count. The final output should be informative, professional, and easy for the general public to understand and follow.",
  "possibleHealthConcerns": ["detailed concern 1 with symptoms", "detailed concern 2 with risks"],
  "oneSentenceSummary": "A single, concise, and impactful sentence containg approiximately 14-17 words summarizing the news and this should be different from the summary",
  "preventiveActions": ["specific preventive action 1", "community-level action 2"],
  "whenToVisitClinic": ["specific symptom indicator 1", "specific clinical sign 1"]
}

MANDATORY DISCLAIMER (must be in summary):
"⚠️ This is educational information only. Consult healthcare professionals for proper diagnosis and treatment."

Respond with VALID JSON ONLY. No markdown formatting, no code blocks, no extra text.`;

    try {
        const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.4,
                max_tokens: 1000
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const advisory = JSON.parse(jsonMatch[0]);
        if (!advisory.title || Object.keys(advisory).length === 0) return null;
        console.log('🤖 GROQ AI RESPONSE:', advisory);
        return advisory;
    } catch {
        return null;
    }
}


