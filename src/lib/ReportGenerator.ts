import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Premium Report Generator Utility
 * Handles CSV and PDF export with consistent branding and metadata.
 */

interface ReportOptions {
    title: string;
    filename: string;
    headers: string[];
    data: any[][];
    orientation?: 'portrait' | 'landscape';
    campusFilter?: string;
    summaryStats?: { label: string; value: string | number }[];
}

export const ReportGenerator = {
    /**
     * Generates and downloads a CSV report
     */
    downloadCSV: (filename: string, headers: string[], data: any[][]) => {
        const csvData = [headers, ...data];
        const csvString = Papa.unparse(csvData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    },

    /**
     * Generates a CSV with an images folder, bundled into a ZIP file 
     */
    downloadCSVArchive: async (filename: string, headers: string[], data: any[][], records: any[], onProgress?: (msg: string) => void) => {
        const zip = new JSZip();
        
        // 1. Add CSV
        const csvData = [headers, ...data];
        const csvString = Papa.unparse(csvData);
        zip.file(`${filename}.csv`, csvString);
        
        // 2. Add Images Folder
        const imgFolder = zip.folder("images");
        if (imgFolder) {
            let processed = 0;
            for (const r of records) {
                const identifier = r.studentId || r.id; // use student ID for clean filenames
                const picUrl = r.picUrl;
                const frontUrl = r.frontUrl;
                const backUrl = r.backUrl;

                const fetchAndAdd = async (url: string, name: string) => {
                    if (!url) return;
                    try {
                        const res = await fetch(url.replace("localhost", "127.0.0.1"));
                        if (res.ok) {
                            const blob = await res.blob();
                            imgFolder.file(name, blob);
                        }
                    } catch (e) {
                        console.error(`Failed to fetch image ${name}`, e);
                    }
                };

                await Promise.all([
                    fetchAndAdd(picUrl, `${identifier}_profile.jpg`),
                    fetchAndAdd(frontUrl, `${identifier}_id_front.jpg`),
                    fetchAndAdd(backUrl, `${identifier}_id_back.jpg`)
                ]);

                processed++;
                if (onProgress && processed % 5 === 0) onProgress(`Zipped ${processed}/${records.length} patients' images...`);
            }
        }

        if (onProgress) onProgress("Compressing ZIP archive...");
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `Report_${new Date().toISOString().split('T')[0]}.zip`);
    },

    /**
     * Generates and downloads a Premium PDF report
     */
    downloadPDF: (options: ReportOptions) => {
        const { 
            title, 
            filename, 
            headers, 
            data, 
            orientation = 'portrait',
            campusFilter = 'All Campuses',
            summaryStats = []
        } = options;

        const doc = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const dateStr = new Date().toLocaleString('en-PH', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // --- Institutional Header ---
        // Blue accent bar at the top
        doc.setFillColor(42, 102, 255); // MedSync Blue
        doc.rect(0, 0, pageWidth, 15, 'F');

        // Main Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.text('PLV MEDSYNC', 14, 30);
        
        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text('Administrative Health Services Report', 14, 37);

        // Divider Line
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(0.5);
        doc.line(14, 45, pageWidth - 14, 45);

        // --- Metadata Section ---
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(`Report Type: ${title}`, 14, 52);
        doc.text(`Generated: ${dateStr}`, 14, 57);
        doc.text(`Campus Instance: ${campusFilter}`, 14, 62);

        // --- Summary Box (If provided) ---
        let currentY = 75;
        if (summaryStats && summaryStats.length > 0) {
            doc.setFillColor(248, 250, 252); // Slate 50
            doc.roundedRect(14, 70, pageWidth - 28, 20, 3, 3, 'F');
            
            let statX = 20;
            const spacing = (pageWidth - 40) / summaryStats.length;
            
            summaryStats.forEach(stat => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(30, 41, 59);
                doc.text(String(stat.value), statX, 81);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(stat.label.toUpperCase(), statX, 86);
                
                statX += spacing;
            });
            currentY = 100;
        }

        // --- Main Data Table ---
        autoTable(doc, {
            head: [headers],
            body: data,
            startY: currentY,
            theme: 'striped',
            headStyles: {
                fillColor: [42, 102, 255],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: 4
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [51, 65, 85],
                cellPadding: 3
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                // Footer
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                const str = `Page ${data.pageNumber} of ${(doc as any).internal.getNumberOfPages()}`;
                doc.text(str, pageWidth - 25, doc.internal.pageSize.getHeight() - 10);
                doc.text('PLV MedSync • Confidential Administrative Document', 14, doc.internal.pageSize.getHeight() - 10);
            }
        });

        doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    },

    /**
     * PDF Generation via Web Worker to prevent UI blocking
     */
    downloadPDFWithWorker: (options: ReportOptions, records: any[], onProgress?: (msg: string) => void): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (onProgress) onProgress("Initializing Background PDF Generator...");

            // Create worker using Vite's URL feature
            const worker = new Worker(new URL('./pdfWorker.ts', import.meta.url), { type: 'module' });

            worker.onmessage = (e) => {
                const { status, message, blob, error } = e.data;
                
                if (status === 'progress' && onProgress) {
                    onProgress(message);
                } else if (status === 'done') {
                    saveAs(blob, `${options.filename}_${new Date().toISOString().split('T')[0]}.pdf`);
                    worker.terminate();
                    resolve();
                } else if (status === 'error') {
                    worker.terminate();
                    reject(new Error(error));
                }
            };

            worker.onerror = (err) => {
                worker.terminate();
                reject(err);
            };

            // Start worker
            worker.postMessage({ options, records });
        });
    }
};
