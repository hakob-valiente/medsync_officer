// Groq AI Service - Server-side
// Generates health advisories, trends, and trivia using Groq AI

import fetch from 'node-fetch';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export async function generateHealthAdvisory(newsArticle) {
    // Access env var INSIDE function (after dotenv has loaded)
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
        console.error('❌ CRITICAL: GROQ_API_KEY is not available at runtime');
        throw new Error('GROQ_API_KEY not configured - cannot generate advisory');
    }

    const prompt = `You are a health education AI for a Philippine university health portal. 
                    Analyze the following news article for its location and health relevance.
                    Generate an EDUCATIONAL health advisory from this news.


CRITICAL INSTRUCTION:
    If the news article does NOT describe the news is occurring in the Philippines or Metro Manila, 
    you must return an empty JSON object {} and nothing else.

News Article:
Title: ${newsArticle.title}
Content: ${newsArticle.description || newsArticle.content || ''}
Source: ${newsArticle.source.name}
Date: ${newsArticle.publishedAt}

If it IS relevant to the Philippines/Metro Manila, generate JSON with this EXACT structure. ALL FIELDS ARE MANDATORY:

{
  "title": "Clear, specific educational title (REQUIRED, never empty)",
  "priority": "high" | "medium" | "low" (REQUIRED, must be one of these exact values),
  "category": "Infectious Disease" | "Respiratory" | "Mental Health" | "Nutrition" | "Environmental Health" | "Chronic Disease" | "Public Health" (REQUIRED, must be one of these),
  "summary": "2-3 sentence educational summary with mandatory disclaimer (REQUIRED, min 50 characters)",
  "possibleHealthConcerns": ["concern 1", "concern 2", "concern 3"] (REQUIRED ARRAY, min 2 items),
  "preventiveActions": ["action 1", "action 2", "action 3"] (REQUIRED ARRAY, min 2 items),
  "whenToVisitClinic": ["when to seek help 1", "when to seek help 2"] (REQUIRED ARRAY, min 2 items),
  "references": [
    {"text": "WHO Philippines", "url": "https://www.who.int/philippines"},
    {"text": "Philippine DOH", "url": "https://doh.gov.ph/"}
  ] (REQUIRED ARRAY, min 2 references)
}

CRITICAL REQUIREMENTS:
1. ALL fields must be present - NO null, undefined, or empty values
2. Arrays MUST have at least 2 items
3. Text fields MUST have meaningful content (no placeholders like "TBD" or "N/A")
4. Category MUST be one of the 7 listed options
5. Priority: "high" only for WHO/DOH alerts or verified outbreaks; "medium" for growing concerns; "low" for awareness
6. If information is incomplete, use professional medical knowledge to fill gaps responsibly
7. NEVER diagnose or prescribe medication
8. NEVER mention "PLV", "campus", or specific institutional services
9. Say "consult healthcare professionals" NOT "visit PLV clinic"
10. Also indicate in the "title" and "summary" where or what place the news was from
11. References: ONLY use WHO Philippines, DOH, CDC, or PAGASA with real URLs

MANDATORY DISCLAIMER (must be in summary):
"\n⚠️ This is educational information only. Consult healthcare professionals for proper diagnosis and treatment."

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

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No content in AI response');
        }

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('AI response:', content);
            throw new Error('AI did not return valid JSON');
        }

        const advisory = JSON.parse(jsonMatch[0]);

        // Check if Groq returned empty object (article not relevant to Philippines)
        if (!advisory.title || Object.keys(advisory).length === 0) {
            console.log('  ⚠️  Article not relevant to Philippines - returning null');
            return null;
        }

        // Ensure disclaimer is in summary
        if (!advisory.summary.includes('⚠️')) {
            advisory.summary += ' ⚠️ This is not a diagnostic tool. Please consult healthcare professionals for proper diagnosis and treatment.';
        }

        return advisory;

    } catch (error) {
        console.error('❌ AI generation error:', error.message);
        
        // Generate fallback advisory when AI fails
        console.log('🔄 Generating fallback advisory from article...');
        return generateFallbackAdvisory(newsArticle);
    }
}

/**
 * Generate fallback advisory when AI API fails
 */
export function generateFallbackAdvisory(newsArticle) {
    const title = newsArticle.title || 'Health Advisory';
    const content = newsArticle.description || newsArticle.content || '';
    
    // Determine category and priority based on keywords
    let category = 'Public Health';
    let priority = 'medium';
    
    if (content.toLowerCase().includes('covid') || content.toLowerCase().includes('coronavirus')) {
        category = 'Infectious Disease';
        priority = 'high';
    } else if (content.toLowerCase().includes('flu') || content.toLowerCase().includes('influenza')) {
        category = 'Respiratory';
        priority = 'medium';
    } else if (content.toLowerCase().includes('mental') || content.toLowerCase().includes('stress')) {
        category = 'Mental Health';
        priority = 'medium';
    } else if (content.toLowerCase().includes('food') || content.toLowerCase().includes('nutrition')) {
        category = 'Nutrition';
        priority = 'low';
    }
    
    // Extract key concerns from content
    const possibleHealthConcerns = [];
    if (content.toLowerCase().includes('fever')) possibleHealthConcerns.push('Fever and elevated body temperature');
    if (content.toLowerCase().includes('cough') || content.toLowerCase().includes('respiratory')) possibleHealthConcerns.push('Respiratory symptoms');
    if (content.toLowerCase().includes('fatigue') || content.toLowerCase().includes('tired')) possibleHealthConcerns.push('Fatigue and weakness');
    if (content.toLowerCase().includes('pain')) possibleHealthConcerns.push('Body aches and discomfort');
    if (possibleHealthConcerns.length === 0) {
        possibleHealthConcerns.push('General health awareness');
        possibleHealthConcerns.push('Preventive health measures');
    }
    
    // Generate preventive actions
    const preventiveActions = [
        'Practice good hygiene and hand washing',
        'Stay hydrated and maintain a balanced diet',
        'Get adequate rest and sleep',
        'Monitor your health symptoms regularly'
    ];
    
    // Generate when to seek help
    const whenToVisitClinic = [
        'If symptoms persist for more than 3 days',
        'If you experience severe symptoms',
        'For regular health check-ups and consultations'
    ];
    
    return {
        title: title.length > 60 ? title.substring(0, 57) + '...' : title,
        priority: priority,
        category: category,
        summary: `Stay informed about current health developments. ${content.substring(0, 100)}... ⚠️ This is educational information only. Consult healthcare professionals for proper diagnosis and treatment.`,
        possibleHealthConcerns: possibleHealthConcerns,
        preventiveActions: preventiveActions,
        whenToVisitClinic: whenToVisitClinic,
        references: [
            { text: 'Philippine DOH', url: 'https://doh.gov.ph/' },
            { text: 'WHO Philippines', url: 'https://www.who.int/philippines' }
        ]
    };
}

/**
 * Analyze health trends from topic counts
 */
export async function analyzeTrends(topicCounts) {
    // Access env var INSIDE function
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY not available at runtime');
        throw new Error('GROQ_API_KEY not configured - cannot analyze trends');
    }

    const prompt = `You are analyzing current health trends in the Philippines based on news frequencies.

Topic counts from recent Philippine health news:
${JSON.stringify(topicCounts, null, 2)}

Generate health trends in this JSON format. ALL FIELDS ARE MANDATORY:

[
  {
    "topic": "Specific health topic name" (REQUIRED, e.g. "Influenza", "Dengue", "COVID-19", "Respiratory Illness"),
    "level": "Low Risk" | "Moderate" | "Elevated" | "High Alert" (REQUIRED, must be one of these exact values),
    "explanation": "Brief explanation of why this is a trend and what people should know" (REQUIRED, min 40 characters)
  }
]

CRITICAL REQUIREMENTS:
1. Return exactly 3-5 trends (no more, no less)
2. ALL fields must be present - NO null, undefined, or empty values
3. Topic must be specific health condition or category
4. Level criteria:
   - "High Alert": >15 mentions AND verified public health concern
   - "Elevated": 8-15 mentions with growing trend
   - "Moderate": 4-7 mentions, worth monitoring
   - "Low Risk": <4 mentions, awareness only
5. Explanation must be educational and actionable (not alarmist)
6. Focus on prevention and public health guidance
7. If data is limited, use professional knowledge to assess risk appropriately

NEVER:
- Return empty arrays
- Use placeholder text like "TBD" or "Unknown"
- Create fear without actionable advice
- Mention specific institutions

Respond with VALID JSON array only. No markdown,no extra text.`;

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
                temperature: 0.3,
                max_tokens: 800
            })
        });

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('AI did not return valid JSON array');
        }

        return JSON.parse(jsonMatch[0]);

    } catch (error) {
        console.error('❌ Trend analysis error:', error.message);
        
        // Generate fallback trends when AI fails
        console.log('🔄 Generating fallback trends...');
        return generateFallbackTrends(topicCounts);
    }
}

/**
 * Generate fallback trends when AI API fails
 */
export function generateFallbackTrends(topicCounts) {
    const trends = [];
    const topics = Object.keys(topicCounts);
    
    // Generate 3-5 trends based on available topics
    const maxTrends = Math.min(5, Math.max(3, topics.length));
    
    for (let i = 0; i < maxTrends; i++) {
        const topic = topics[i % topics.length];
        const count = topicCounts[topic];
        
        let level = 'Low Risk';
        if (count > 10) level = 'High Alert';
        else if (count > 5) level = 'Elevated';
        else if (count > 2) level = 'Moderate';
        
        let explanation = '';
        switch (topic.toLowerCase()) {
            case 'covid-19':
                explanation = 'COVID-19 continues to be monitored. Practice good hygiene and stay updated with health advisories.';
                break;
            case 'flu':
                explanation = 'Influenza season may be approaching. Get vaccinated and practice respiratory hygiene.';
                break;
            case 'dengue':
                explanation = 'Dengue prevention is important during rainy season. Eliminate mosquito breeding sites.';
                break;
            case 'mental health':
                explanation = 'Mental health awareness is growing. Seek support when needed and practice self-care.';
                break;
            default:
                explanation = `${topic} is being monitored in health news. Stay informed and take preventive measures.`;
        }
        
        trends.push({
            topic: topic,
            level: level,
            explanation: explanation
        });
    }
    
    return trends;
}

/**
 * Generate daily health trivia
 */
export async function generateHealthTrivia() {
    // Access env var INSIDE function
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY not available at runtime');
        throw new Error('GROQ_API_KEY not configured - cannot generate trivia');
    }

    const prompt = `Generate ONE interesting health trivia fact relevant to the Philippines.

JSON format - ALL FIELDS ARE MANDATORY:

{
  "question": "Did you know? [Interesting health fact as a question]" (REQUIRED, min 20 characters),
  "answer": "Detailed, educational answer with context and explanation" (REQUIRED, min 80 characters),
  "reference": {
    "text": "WHO" | "Philippine DOH" | "CDC" (REQUIRED, must be one of these exact values),
    "url": "Real public health organization URL" (REQUIRED, must be valid WHO/DOH/CDC URL)
  }
}

CRITICAL REQUIREMENTS:
1. ALL fields must be present - NO null, undefined, or empty values
2. Question must start with "Did you know?" and be engaging
3. Answer must be substantial (minimum 80 characters) with educational value
4. Reference text MUST be exactly "WHO", "Philippine DOH", or "CDC"
5. Reference URL must be real and accessible:
   - WHO: https://www.who.int/philippines or https://www.who.int/
   - DOH: https://doh.gov.ph/
   - CDC: https://www.cdc.gov/
6. Content must be:
   - Interesting and surprising
   - Relevant to Filipino health context when possible
   - Not time-sensitive or news-based
   - General wellness/prevention focused
   - Scientifically accurate

NEVER:
- Return incomplete data
- Use placeholder text
- Make unverified claims
- Reference outdated information

Respond with VALID JSON only. No markdown, no code blocks, no extra text.`;

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
                temperature: 0.7,
                max_tokens: 500
            })
        });

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI did not return valid JSON');
        }

        return JSON.parse(jsonMatch[0]);

    } catch (error) {
        console.error('❌ Trivia generation error:', error.message);
        
        // Generate fallback trivia when AI fails
        console.log('🔄 Generating fallback trivia...');
        return generateFallbackTrivia();
    }
}

/**
 * Generate fallback trivia when AI API fails
 */
export function generateFallbackTrivia() {
    const triviaOptions = [
        {
            question: "Did you know? The Philippines has one of the highest rates of dengue fever in the world?",
            answer: "Dengue fever is a mosquito-borne viral infection that affects millions annually in tropical regions like the Philippines. Prevention focuses on eliminating mosquito breeding sites and using protective measures like mosquito nets and repellents.",
            reference: {
                text: "WHO",
                url: "https://www.who.int/philippines"
            }
        },
        {
            question: "Did you know? Mental health conditions affect 1 in 4 people globally, including in the Philippines?",
            answer: "Mental health is a crucial aspect of overall well-being. In the Philippines, stress, anxiety, and depression are common concerns. Seeking professional help, maintaining social connections, and practicing self-care are important preventive measures.",
            reference: {
                text: "Philippine DOH",
                url: "https://doh.gov.ph/"
            }
        },
        {
            question: "Did you know? Regular hand washing can reduce respiratory infections by up to 23%?",
            answer: "Proper hand hygiene is one of the most effective ways to prevent the spread of infectious diseases. Washing hands with soap and water for at least 20 seconds helps remove germs and reduces the risk of illnesses like flu and colds.",
            reference: {
                text: "CDC",
                url: "https://www.cdc.gov/"
            }
        }
    ];
    
    // Return a random trivia
    return triviaOptions[Math.floor(Math.random() * triviaOptions.length)];
}
