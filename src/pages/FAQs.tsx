import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info, MessageSquare } from 'lucide-react';

const FAQsData = [
  {
    id: 1,
    question: "How can I request for medicine or a medical certificate?",
    answer: "You can submit a request through the 'Requests' section. Simply choose whether you need medicine or a certificate, provide the necessary details, and submit. You will receive a notification once our clinic staff has processed and approved your request."
  },
  {
    id: 2,
    question: "Is there always a nurse or doctor available at the clinic?",
    answer: "Yes, we ensure that a medical officer is on duty during university hours. You can check the 'Duty Assignment' section to see which staff members are currently available at your specific campus clinic."
  },
  {
    id: 3,
    question: "What should I do if the medicine I need is out of stock?",
    answer: "Our system monitors inventory in real-time. If an item is listed as low stock or unavailable, our clinic staff will be alerted to restock it. In the meantime, the duty officer can recommend alternatives or provide a prescription for external use."
  },
  {
    id: 4,
    question: "Can I choose which campus clinic to visit for my appointment?",
    answer: "Absolutely. When booking an appointment, you can select the campus clinic most convenient for you. We manage schedules across all campuses to ensure you can receive medical attention wherever you are on campus."
  },
  {
    id: 5,
    question: "How is my medical history recorded and kept safe?",
    answer: "Every clinic visit and request is automatically logged in our secure system. This creates a digital medical history that helps our doctors provide better care. All data is encrypted and only accessible to authorized medical personnel."
  }
];

export default function FAQs() {
  const [openId, setOpenId] = useState<number | null>(1); // First open by default

  const toggleFaq = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Student Wellness Center FAQs</h2>
          <p className="text-[15px] mt-1 font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>
            Find helpful information about using the clinic's digital services.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
             style={{ background: 'var(--accent-light)', border: '1px solid rgba(72, 187, 238, 0.15)' }}>
          <HelpCircle size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-deep)' }}>Student Support</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {FAQsData.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div 
                key={faq.id} 
                className="rounded-xl overflow-hidden transition-all duration-300"
                style={{ 
                  background: 'var(--card-bg)', 
                  border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`, 
                  boxShadow: isOpen ? 'var(--shadow-md)' : 'var(--shadow-sm)' 
                }}
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left transition-colors"
                  onClick={() => toggleFaq(faq.id)}
                  style={{ background: isOpen ? 'var(--bg-wash)' : 'transparent' }}
                >
                  <span className="font-semibold text-[15px] pr-4" style={{ color: isOpen ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {faq.question}
                  </span>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors" 
                       style={{ background: isOpen ? 'var(--accent-light)' : 'var(--bg-wash)' }}>
                    {isOpen ? (
                      <ChevronUp size={16} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                </button>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-5 pt-1 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <div className="pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="space-y-4">
          <div className="rounded-xl p-5 fade-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
              <Info size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Need more help?</h3>
            <p className="text-[15px] mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              If you have further questions or encounter any system issues, please reach out to the technical support team.
            </p>
            <button className="w-full py-2.5 rounded-lg text-[15px] font-semibold transition-all flex items-center justify-center gap-2"
                    style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 4px 12px rgba(59, 172, 237, 0.3)' }}>
              <MessageSquare size={16} /> Contact Support
            </button>
          </div>
          
          <div className="rounded-xl p-5 fade-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
             <h3 className="font-semibold text-[15px] mb-3 uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>System Information</h3>
             <div className="space-y-2">
                <div className="flex justify-between text-[13px]">
                   <span style={{ color: 'var(--text-muted)' }}>Version</span>
                   <span className="font-medium" style={{ color: 'var(--text-primary)' }}>v2.4.1</span>
                </div>
                <div className="flex justify-between text-[13px]">
                   <span style={{ color: 'var(--text-muted)' }}>Last Updated</span>
                   <span className="font-medium" style={{ color: 'var(--text-primary)' }}>April 2026</span>
                </div>
                <div className="flex justify-between text-[13px]">
                   <span style={{ color: 'var(--text-muted)' }}>License</span>
                   <span className="font-medium" style={{ color: 'var(--text-primary)' }}>PLV MedSync Internal</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

