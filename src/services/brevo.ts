export interface BrevoEmailOptions {
    templateId: number;
    toEmail: string;
    params: Record<string, any>;
    attachment?: Array<{ content: string; name: string }>;
}

export async function sendBrevoEmail(options: BrevoEmailOptions): Promise<any> {
    const apiKey = import.meta.env.VITE_BREVO_API_KEY;
    if (!apiKey) {
        console.warn('Brevo API key missing. Email not sent.');
        return;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            templateId: options.templateId,
            to: [{ email: options.toEmail }],
            params: options.params,
            attachment: options.attachment
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send Brevo email');
    }

    return response.json();
}
