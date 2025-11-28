import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Trash2, MessageSquare, Calendar, MapPin, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger } from
"@/components/ui/alert-dialog";
import { toast } from 'sonner';

const DetailItem = ({ label, value }) =>
<div>
    <label className="text-xs text-[#64748B]">{label}</label>
    <p className="text-sm text-[#1E293B] font-normal">{value || 'N/A'}</p>
  </div>;


export default function CallDetailSidebar({ log, onBack, onDelete }) {
  const [activeTab, setActiveTab] = useState('details');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Get user timezone - default to EST
  const userTimezone = 'America/New_York';

  // Helper function to format timestamp in user's timezone
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
      const date = new Date(timestamp);

      return date.toLocaleString('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return 'Invalid date';
    }
  };

  // Helper for short date format
  const formatShortTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
      const date = new Date(timestamp);

      return date.toLocaleString('en-US', {
        timeZone: userTimezone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return 'Invalid date';
    }
  };

  const transcript = useMemo(() => {
    // 1. Try `log.transcript` first
    if (log.transcript) {
      try {
        const parsed = JSON.parse(log.transcript);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn("Could not parse log.transcript", e);
      }
    }

    // 2. Fallback to checking `log.metadata`
    if (log.metadata) {
      try {
        const metadata = JSON.parse(log.metadata);
        // Check for transcript within raw webhook data nested in metadata
        const rawData = metadata.elevenlabs_transcription_raw_webhook_data || metadata.raw_webhook_data;
        const nestedTranscript = rawData?.data?.transcript;

        if (Array.isArray(nestedTranscript) && nestedTranscript.length > 0) {
          return nestedTranscript;
        }
      } catch (e) {
        console.warn("Could not parse transcript from log.metadata", e);
      }
    }

    // 3. Return empty array if not found
    return [];
  }, [log.transcript, log.metadata]);

  // Extract appointment details from metadata
  const appointmentDetails = useMemo(() => {
    console.log('[CallDetailSidebar] Extracting appointment details for log:', log.id);
    console.log('[CallDetailSidebar] Log status:', log.status);
    console.log('[CallDetailSidebar] Log metadata:', log.metadata);

    if (!log.metadata) {
      console.log('[CallDetailSidebar] No metadata found');
      return null;
    }

    try {
      const metadata = JSON.parse(log.metadata);
      console.log('[CallDetailSidebar] Parsed metadata:', metadata);

      const rawData = metadata.elevenlabs_transcription_raw_webhook_data;
      console.log('[CallDetailSidebar] Raw webhook data:', rawData);

      const appointmentData = rawData?.data?.metadata;
      console.log('[CallDetailSidebar] Appointment data:', appointmentData);

      // Check if appointment was set
      const isAppointmentSet = appointmentData?.appointment_set === true ||
      appointmentData?.appointment_set === 'true' ||
      log.status === 'appointment_set';

      console.log('[CallDetailSidebar] Is appointment set?', isAppointmentSet);

      if (isAppointmentSet) {
        const details = {
          startTime: appointmentData?.startTime,
          address: appointmentData?.address || formData.address,
          prospectName: `${formData.prospect_first_name || log.prospectFirstName || ''} ${formData.prospect_last_name || log.prospectLastName || ''}`.trim(),
          email: appointmentData?.email_address || formData.email
        };

        console.log('[CallDetailSidebar] Returning appointment details:', details);
        return details;
      }
    } catch (e) {
      console.error("[CallDetailSidebar] Could not parse appointment details from metadata", e);
    }

    console.log('[CallDetailSidebar] No appointment details found');
    return null;
  }, [log.metadata, log.status, formData, log.prospectFirstName, log.prospectLastName]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        if (log.analysis) {
          try {
            setAnalysis(JSON.parse(log.analysis));
          } catch {setAnalysis({ error: "Could not parse analysis JSON." });}
        }
        if (log.formData) {
          try {
            const parsedData = JSON.parse(log.formData);
            // Handle different possible keys for address
            const address = parsedData.property_address || parsedData.address || parsedData.meetingAddress;
            setFormData({ ...parsedData, address });
          } catch {setFormData({ error: "Could not parse form data." });}
        }

        if (log.recordingUrl) {
          setAudioLoading(true);
          try {
            const { data } = await base44.functions.invoke('getSignedAudioUrl', { file_uri: log.recordingUrl });
            if (data.signed_url) {
              setAudioUrl(data.signed_url);
            }
          } catch (e) {
            console.error("Failed to get signed audio URL", e);
            setAudioUrl(null);
          } finally {
            setAudioLoading(false);
          }
        }

      } catch (e) {
        console.error("Error fetching details", e);
      } finally {
        setLoading(false);
      }
    };

    const fetchHistory = async () => {
      if (log.contactPhone) {
        setHistoryLoading(true);
        try {
          const historyLogs = await base44.entities.CallLog.filter({ contactPhone: log.contactPhone }, '-created_date');
          setHistory(historyLogs);
        } catch (e) {
          console.error("Failed to fetch call history", e);
          setHistory([]);
        } finally {
          setHistoryLoading(false);
        }
      }
    };

    fetchDetails();
    fetchHistory();
  }, [log]);

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const handleDelete = async () => {
    try {
      const { CallLog } = await import('@/api/entities');
      await CallLog.delete(log.id);
      toast.success("Call log deleted.");
      onDelete();
      if (onBack) onBack();
    } catch (e) {
      toast.error("Failed to delete call log.");
      console.error(e);
    }
  };

  const downloadTranscript = () => {
    if (!transcript || transcript.length === 0) {
      toast.error("No transcript available to download.");
      return;
    }

    let transcriptText = `Call Transcript\n`;
    transcriptText += `Contact: ${log.prospectFirstName || 'Unknown'} ${log.prospectLastName || ''}\n`;
    transcriptText += `Date: ${formatShortTimestamp(log.created_date)}\n\n`;

    transcript.forEach((item) => {
      const speaker = item.role === 'user' ? log.prospectFirstName || 'Client' : 'Agent';
      transcriptText += `${speaker}:\n${item.message}\n\n`;
    });

    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transcript_${log.id}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Transcript downloaded.");
  };

  const renderDetailsTab = () =>
  <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[#1E293B] mb-3">Prospect Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <DetailItem label="First Name" value={log.prospectFirstName} />
          <DetailItem label="Last Name" value={log.prospectLastName} />
          <DetailItem label="Phone Number" value={log.contactPhone} />
          <DetailItem label="Email" value={formData.email} />
          <DetailItem label="Property Address" value={formData.address} />
          <DetailItem label="Active Buyer" value={formData.activeBuyer ? 'Yes' : 'No'} />
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold text-[#1E293B] mb-3">Call Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <DetailItem label="Duration" value={formatDuration(log.duration)} />
          <DetailItem label="Call Type" value={formData.call_type || 'N/A'} />
          <DetailItem label="Source" value={formData.lead_source || formData.source || (log.campaignName === 'Single Call' ? 'Single Call' : 'CSV Upload')} />
        </div>
      </div>
    </div>;


  const renderAppointmentTab = () => {
    if (!appointmentDetails) {
      return (
        <div className="text-center py-10">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500">No appointment was set during this call.</p>
        </div>);

    }

    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-green-600" />
            <h4 className="text-base font-semibold text-green-900">Appointment Scheduled</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 font-medium">Date & Time</p>
                <p className="text-sm text-gray-900">
                  {appointmentDetails.startTime ? formatTimestamp(appointmentDetails.startTime) : 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 font-medium">Location</p>
                <p className="text-sm text-gray-900">{appointmentDetails.address || 'Not specified'}</p>
              </div>
            </div>
            
            {appointmentDetails.prospectName &&
            <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 font-medium">Prospect</p>
                  <p className="text-sm text-gray-900">{appointmentDetails.prospectName}</p>
                </div>
              </div>
            }
            
            {appointmentDetails.email &&
            <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 font-medium">Email</p>
                  <p className="text-sm text-gray-900">{appointmentDetails.email}</p>
                </div>
              </div>
            }
          </div>
        </div>
        
        <div className="bg-slate-50 p-3 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-xs">This appointment has been automatically added to your Google Calendar.

          </p>
        </div>
      </div>);

  };

  const renderTranscriptTab = () => {
    return (
      <div className="space-y-4">
         <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-[#1E293B]">Conversation Transcript</h3>
            <Button variant="ghost" size="icon" onClick={downloadTranscript}><Download className="w-4 h-4 text-[#475569]" /></Button>
         </div>
         <div className="space-y-3 text-sm max-h-[500px] overflow-y-auto pr-2">
          {transcript.length > 0 ? transcript.map((item, index) =>
          <div key={index} className="flex flex-col">
              <span className="font-semibold capitalize text-[#64748B] text-xs mb-1">{item.role === 'user' ? log.prospectFirstName || 'Client' : 'Agent'}</span>
              <p className="p-3 rounded-lg bg-gray-50 text-gray-800">{item.message}</p>
            </div>
          ) : <p className="text-center text-xs text-gray-500 py-4">No transcript available for this call.</p>}
        </div>
      </div>);

  };

  const renderRecordingTab = () =>
  <div className="space-y-4">
      <h3 className="text-base font-semibold text-[#1E293B]">Call Recording</h3>
      {audioLoading ?
    <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading recording...
        </div> :
    audioUrl ?
    <audio controls className="w-full h-10" src={audioUrl} /> :

    <p className="text-sm text-gray-500">No recording available for this call.</p>
    }
    </div>;


  const renderHistoryTab = () => {
    if (historyLoading) {
      return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>;
    }
    if (history.length <= 1) {
      return (
        <div className="text-center py-10">
                  <p className="mt-4 text-sm text-gray-500">No other calls found for this contact.</p>
              </div>);

    }
    return (
      <div className="space-y-3">
             {history.map((call) =>
        <div key={call.id} className="border p-3 rounded-lg bg-gray-50 text-sm">
                    <p className="font-medium text-gray-800">{formatShortTimestamp(call.created_date)}</p>
                    <p className="text-xs text-gray-600 capitalize">Status: {call.status?.replace(/_/g, ' ') || 'N/A'}</p>
                    <p className="text-xs text-gray-600">Duration: {formatDuration(call.duration)}</p>
                </div>
        )}
        </div>);

  };


  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':return 'bg-green-100 text-green-700';
      case 'appointment_set':return 'bg-blue-100 text-blue-700';
      case 'failed':return 'bg-red-100 text-red-700';
      default:return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="px-6 py-6 h-full flex flex-col">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-lg font-medium text-[#1E293B]">{log.prospectFirstName} {log.prospectLastName}</h2>
          <Badge className={`${getStatusBadge(log.status)} mt-1`}>{log.status?.replace(/_/g, ' ')}</Badge>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6 text-sm">
        <button onClick={() => setActiveTab('details')} className={`pb-2 border-b-2 ${activeTab === 'details' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-[#64748B]'}`}>Details</button>
        <button onClick={() => setActiveTab('appointment')} className={`pb-2 border-b-2 ${activeTab === 'appointment' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-[#64748B]'}`}>
          Appointment
          {appointmentDetails && <span className="ml-1 text-xs">✓</span>}
        </button>
        <button onClick={() => setActiveTab('transcript')} className={`pb-2 border-b-2 ${activeTab === 'transcript' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-[#64748B]'}`}>Transcript</button>
        <button onClick={() => setActiveTab('recording')} className={`pb-2 border-b-2 ${activeTab === 'recording' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-[#64748B]'}`}>Recording</button>
        <button onClick={() => setActiveTab('history')} className={`pb-2 border-b-2 ${activeTab === 'history' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-[#64748B]'}`}>History</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 mb-6">
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'appointment' && renderAppointmentTab()}
        {activeTab === 'transcript' && renderTranscriptTab()}
        {activeTab === 'recording' && renderRecordingTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </div>

      <div className="mt-auto pt-6 border-t border-gray-200">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive-outline" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Call Log
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the call log and its recording. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>);

}