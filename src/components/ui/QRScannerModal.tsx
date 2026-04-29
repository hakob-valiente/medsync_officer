import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { X, Camera, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface QRScannerModalProps {
    onClose: () => void;
    onScan: (decodedText: string) => void | Promise<void>;
    expectedId?: string;
}

export function QRScannerModal({ onClose, onScan, expectedId }: QRScannerModalProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        let isMounted = true;
        let html5QrCode: Html5Qrcode | null = null;
        const scannerId = "qr-reader";
        
        const startScanner = async () => {
            try {
                const container = document.getElementById(scannerId);
                if (!container || !isMounted) return;

                const devices = await Html5Qrcode.getCameras();
                if (!isMounted) return;

                if (devices && devices.length > 0) {
                    setHasPermission(true);
                    
                    html5QrCode = new Html5Qrcode(scannerId);
                    scannerRef.current = html5QrCode;

                    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                    await html5QrCode.start(
                        { facingMode: "environment" },
                        config,
                        (decodedText) => {
                            if (expectedId && decodedText !== expectedId) {
                                setError("Invalid QR Code. Please scan the correct request QR.");
                                return;
                            }
                            
                            if (html5QrCode?.getState() === Html5QrcodeScannerState.SCANNING) {
                                html5QrCode.stop().then(() => {
                                    if (isMounted) onScan(decodedText);
                                }).catch(() => {
                                    if (isMounted) onScan(decodedText);
                                });
                            }
                        },
                        undefined
                    );
                    
                    if (isMounted) setIsScanning(true);
                } else {
                    if (isMounted) setError("No camera found on this device.");
                }
            } catch (err: any) {
                if (!isMounted) return;
                console.error("Camera error:", err);
                if (err.toString().includes("NotAllowedError") || err.toString().includes("Permission denied")) {
                    setHasPermission(false);
                    setError("Camera permission denied. Please enable camera access in your browser settings.");
                } else {
                    setError("Could not start camera. " + err.message);
                }
            }
        };

        // Delay starting to handle React Strict Mode remounts better
        const timer = setTimeout(startScanner, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            
            const cleanup = async () => {
                if (html5QrCode) {
                    try {
                        const state = html5QrCode.getState();
                        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                            await html5QrCode.stop();
                        }
                        html5QrCode.clear();
                    } catch (err) {
                        console.warn("Cleanup error:", err);
                        try { html5QrCode.clear(); } catch(e) {}
                    }
                }
            };
            cleanup();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl shadow-2xl w-full max-w-md fade-in overflow-hidden flex flex-col" 
                style={{ background: 'var(--card-bg)' }}
                onClick={(e) => e.stopPropagation()}>
                
                <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100">
                            <Camera size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>QR Verification</h2>
                            <p className="text-[11px] font-extrabold uppercase tracking-widest mt-0.5 text-slate-400">Scan Student Dispense Pass</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100" style={{ color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex-1 flex flex-col items-center justify-center space-y-6">
                    {hasPermission === false ? (
                        <div className="text-center space-y-4 py-8">
                            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-500 mb-2">
                                <ShieldAlert size={40} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">Permission Required</h3>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                                Camera access is needed to scan the dispense QR code. Please update your browser permissions.
                            </p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 rounded-xl bg-blue-500 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md active:scale-95"
                            >
                                Refresh Page
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden bg-slate-900 shadow-inner border-4 border-slate-100 group">
                                <div id="qr-reader" className="w-full h-full object-cover"></div>
                                
                                {/* Scanning Overlay */}
                                {isScanning && !error && (
                                    <div className="absolute inset-0 pointer-events-none border-[30px] border-black/20">
                                        <div className="w-full h-1 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                                    </div>
                                )}
                            </div>

                            {error ? (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 w-full animate-shake">
                                    <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={16} />
                                    <p className="text-[11px] font-medium text-red-700 leading-relaxed">{error}</p>
                                </div>
                            ) : (
                                <div className="text-center space-y-2">
                                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                                        <CheckCircle2 size={14} />
                                        <span>Scanner Active</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium">Position the QR code within the frame to verify dispense.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 border-t bg-slate-50/50 flex justify-center" style={{ borderColor: 'var(--border-light)' }}>
                    <button 
                        onClick={onClose}
                        className="w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                        Cancel Verification
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: 100%; }
                    100% { top: 0; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-scan { animation: scan 2s ease-in-out infinite; }
                .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
                #qr-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
            `}</style>
        </div>
    );
}
