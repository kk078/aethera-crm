import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Modal, Input, Form, message, Spin, Empty, Alert, Divider, Tooltip, Badge, Row, Col, Tabs, Select, Collapse, Descriptions, Progress } from 'antd';
import { PhoneOutlined, MessageOutlined, RobotOutlined, ReloadOutlined, ThunderboltOutlined, SoundOutlined, FileTextOutlined, CloseOutlined, DeleteOutlined, BulbOutlined, BookOutlined, FundOutlined, SafetyOutlined, MedicineBoxOutlined, AuditOutlined, DollarOutlined, CopyOutlined, CheckCircleOutlined, FieldTimeOutlined, WarningOutlined, InfoCircleOutlined, AudioOutlined, AudioMutedOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { twilioAPI, aiAPI, onboardingAPI, dealsAPI } from '@services/api';
import { Device } from '@twilio/voice-sdk';

// Silence non-actionable Twilio SDK console noise
const origLog = console.log.bind(console);
const origWarn = console.warn.bind(console);
console.log = (...args: any[]) => {
  const msg = String(args[0] || '');
  if (msg.includes('[TwilioVoice]') || msg.includes('AudioContext')) return;
  origLog(...args);
};
console.warn = (...args: any[]) => {
  const msg = String(args[0] || '');
  if (msg.includes('[TwilioVoice]') || msg.includes('Unable to set audio')) return;
  origWarn(...args);
};
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface CallRecord {
  id: string;
  twilio_call_sid: string;
  from_number: string;
  to_number: string;
  direction: string;
  status: string;
  duration: number | null;
  recording_url: string | null;
  transcription: string | null;
  ai_summary: string | null;
  sentiment_score: number | null;
  notes: string | null;
  created_at: string;
}

interface CallPreview {
  provider: { name: string; specialty: string; city: string; state: string; npi: string; phone: string; email: string } | null;
  call_history: { total_calls: number; last_call_date: string; last_outcome: string; sentiment_trend: string; recent_calls: any[] };
  suggested_script: { opening: string; value_propositions: string[]; objections: Array<{ objection: string; response: string }>; common_pain_points: string[] };
  sentiment_warning: string | null;
}

const billingTopics = [
  { icon: <BookOutlined />, label: 'CPT Codes', question: 'Tell me about CPT 99214 and how to document it' },
  { icon: <SafetyOutlined />, label: 'Modifiers', question: 'How do I use modifier 25 correctly' },
  { icon: <FundOutlined />, label: 'Denial Mgmt', question: 'How do I appeal a denied claim' },
  { icon: <MedicineBoxOutlined />, label: 'ICD-10', question: 'ICD-10 coding specificity' },
  { icon: <AuditOutlined />, label: 'Medicare', question: 'Medicare billing requirements' },
  { icon: <DollarOutlined />, label: 'RCM', question: 'Revenue cycle management stages' },
  { icon: <SafetyOutlined />, label: 'HIPAA', question: 'HIPAA compliance requirements' },
  { icon: <FileTextOutlined />, label: 'Prior Auth', question: 'Prior authorization process' },
  { icon: <RobotOutlined />, label: 'E&M Time', question: 'Time-based E&M coding rules' },
  { icon: <SoundOutlined />, label: 'Telehealth', question: 'Telehealth billing codes' },
];

const dialPadButtons = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['*', '0', '#']];

const Calls: React.FC = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [callAssistResult, setCallAssistResult] = useState<any>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [localNumber, setLocalNumber] = useState('');
  const [preview, setPreview] = useState<CallPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [callActiveSid, setCallActiveSid] = useState<string | null>(null);
  const [outcomeModalVisible, setOutcomeModalVisible] = useState(false);
  const [outcomeForm] = Form.useForm();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ───── Softphone state ─────
  const [deviceReady, setDeviceReady] = useState(false);
  const [callInProgress, setCallInProgress] = useState<boolean>(false);
  const [muted, setMuted] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const deviceRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);
  const [providerInfo, setProviderInfo] = useState<{ name: string; specialty: string } | null>(null);

  // ───── Call Flow Assistant State ─────
  const [flowResponse, setFlowResponse] = useState<any>(null);
  const [currentPhase, setCurrentPhase] = useState('hook');
  const [conversationLog, setConversationLog] = useState<string[]>([]);
  const [transcript, setTranscript] = useState('');
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [fallbackInput, setFallbackInput] = useState('');
  const [alternativeIndex, setAlternativeIndex] = useState(0);
  const recognitionRef = useRef<any>(null);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await twilioAPI.getCallLogs();
      setCalls(res?.data && Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error loading calls:', e);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCalls(); }, []);

  // ───── Initialize Twilio Device (browser softphone) ─────
  useEffect(() => {
    let cancelled = false;

    const initDevice = async () => {
      try {
        const tokenRes = await twilioAPI.getToken();
        const token = tokenRes?.data?.data?.token;
        if (cancelled || !token) return;
        const device = new Device(token, { logLevel: 0 });
        deviceRef.current = device;

        device.on('registered', () => { if (!cancelled) setDeviceReady(true); });
        device.on('error', () => {});

        await device.register();
      } catch (e) {
        console.error('Twilio init error:', e);
      }
    };
    initDevice();
    return () => {
      cancelled = true;
      setDeviceReady(false);
      if (deviceRef.current) { try { deviceRef.current.destroy(); } catch {} }
      deviceRef.current = null;
    };
  }, []);

  // ───── SpeechRecognition (start before connect so it owns the mic first) ─────
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setRecognitionActive(false); return; }
    if (recognitionRef.current) { try { (recognitionRef.current as any).stop(); } catch {} }
    const recognition = new SR();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (!r.isFinal) continue;
        const text = (r[0].transcript as string).trim();
        if (text.length < 3) continue;
        setTranscript(text);
        setConversationLog((prev: string[]) => [...prev, text]);
      }
    };
    recognition.onend = () => {
      if (callInProgress && recognitionRef.current) {
        try { (recognitionRef.current as any).start(); } catch {}
      }
    };
    recognition.onerror = () => setRecognitionActive(false);
    try { recognition.start(); setRecognitionActive(true); } catch { setRecognitionActive(false); }
  }, [callInProgress]);

  useEffect(() => {
    if (!callInProgress) {
      if (recognitionRef.current) { try { (recognitionRef.current as any).stop(); } catch {} }
      recognitionRef.current = null;
    }
  }, [callInProgress]);

  // ───── Outreach Flow ─────
  useEffect(() => {
    if (!transcript || transcript.length < 3) return;
    const t = setTimeout(async () => {
      try {
        const spec = preview?.provider?.specialty || 'General Practice';
        const res = await aiAPI.getOutreachFlow({ query: transcript, current_phase: currentPhase, conversation_log: conversationLog, specialty: spec });
        if (res?.data) {
          setFlowResponse(res.data);
          setCurrentPhase(res.data?.phase || 'hook');
          setAlternativeIndex(0);
        }
      } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [transcript]);

  // ───── Timer ─────
  useEffect(() => {
    if (timerRunning) { timerRef.current = setInterval(() => setTimer(t => t + 1), 1000); }
    else if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const formatTimer = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Load preview
  useEffect(() => {
    const digits = (countryCode + localNumber).replace(/\D/g, '');
    if (digits.length >= 10) {
      setPreviewLoading(true);
      aiAPI.callPreview(digits)
        .then(res => setPreview(res?.data || null))
        .catch((e: any) => {
          console.error('Preview load error:', e);
          setPreview(null);
        })
        .finally(() => setPreviewLoading(false));
    } else {
      setPreview(null);
    }
  }, [countryCode, localNumber]);

  const handleMakeCall = async () => {
    const fullNumber = countryCode + localNumber;
    if (fullNumber.length < 5) { message.warning('Enter a phone number'); return; }
    if (!deviceRef.current || !deviceReady) { message.warning('Phone not ready. Please wait...'); return; }

    try {
      // Start listening BEFORE connect so SpeechRecognition claims mic first
      startListening();

      const call = await (deviceRef.current as any).connect({ params: { To: fullNumber } });
      activeCallRef.current = call;

      call.on('accept', () => {
        setCallInProgress(true);
        setTimerRunning(true);
        setTimer(0);
      });

      call.on('disconnect', () => {
        setCallInProgress(false);
        setTimerRunning(false);
        setOutcomeModalVisible(true);
        outcomeForm.resetFields();
        setCallActiveSid(call.parameters?.CallSid || null);
        activeCallRef.current = null;
        loadCalls();
      });

      call.on('error', (err: any) => { message.error(`Call error: ${err.message}`); });
    } catch (e: any) { message.error(`Call failed: ${e.message}`); }
  };

  const handleEndCall = () => {
    if (activeCallRef.current) { (activeCallRef.current as any).disconnect(); }
  };

  const handleToggleMute = () => {
    if (activeCallRef.current) {
      const newMuted = !muted;
      (activeCallRef.current as any).mute(newMuted);
      setMuted(newMuted);
    }
  };

  const handleSaveOutcome = async (values: any) => {
    try {
      if (callActiveSid) {
        const outcomeRes = await twilioAPI.setOutcome(callActiveSid, { outcome: values.outcome, notes: values.notes || '' });
        if (outcomeRes?.data) {
          message.success('Outcome saved');
          setOutcomeModalVisible(false);
          loadCalls();
        }
      }
    } catch (e: any) {
      message.error(`Save failed: ${e.message || 'Unknown error'}`);
    }
  };

  const handleConvertToOnboarding = async () => {
    if (!callActiveSid) {
      message.warning('No active call to convert');
      return;
    }
    // Get current values from the form
    const values = outcomeForm.getFieldsValue();
    try {
      // Find the call record first
      const callsRes = await twilioAPI.getCallLogs();
      const call = Array.isArray(callsRes?.data) ? callsRes.data.find((c: any) => c.twilio_call_sid === callActiveSid) : null;

      if (call) {
        // Create a new deal linked to this call
        const dealData = {
          name: `Follow-up for ${call.from_number || 'Unknown'}`,
          pipeline_stage: 'qualified',
          onboarding_stage: 'initial',
          outcome: values.outcome,
        };

        const dealRes = await dealsAPI.create(dealData);
        if (dealRes?.data?.data?.id) {
          message.success(`Deal created: ${dealRes.data.data.name}`);
          // Link phone_call_id to deal
          await twilioAPI.setOutcome(callActiveSid, {
            outcome: values.outcome,
            notes: values.notes || '',
            deal_id: dealRes.data.data.id,
          });
        }
      } else {
        message.warning('Could not find call record for this SID');
      }
    } catch (e: any) {
      message.error(`Failed to convert to onboarding: ${e.message || 'Unknown error'}`);
    }
  };

  const handleDialPad = (digit: string) => {
    if (countryCode === '+1' && localNumber.length < 10) setLocalNumber(prev => prev + digit);
    else if (countryCode === '+1' && localNumber.length >= 10) return;
    else setLocalNumber(prev => prev + digit);
  };

  const handleDeleteDigit = () => { if (localNumber.length > 0) setLocalNumber(prev => prev.slice(0, -1)); };
  const handleClear = () => { setLocalNumber(''); setPreview(null); };
  const handleCountryCodeChange = (value: string) => { setCountryCode(value); setLocalNumber(''); setPreview(null); };

  const handleSendSMS = async () => {
    const fullNumber = countryCode + localNumber;
    if (fullNumber.length < 5) { message.warning('Enter a phone number'); return; }
    const body = prompt('Enter SMS message:'); if (!body) return;
    try { await twilioAPI.sendSMS(fullNumber, body); message.success('SMS sent'); } catch (e: any) { message.error(`SMS failed: ${e.message}`); }
  };

  const handleCallAssist = async (call: CallRecord) => {
    setSelectedCall(call); setAssistLoading(true); setCallAssistResult(null);
    try {
      const res = await aiAPI.callAssist(call.id, call.transcription || undefined);
      if (res?.data) setCallAssistResult(res.data);
    } catch (e: any) {
      message.error(`Assist failed: ${e.message || 'Unknown error'}`);
    }
    setAssistLoading(false);
  };

  const handleAiQuery = async (query?: string) => {
    const q = query || aiQuery; if (!q) return;
    setAiSearching(true); setAiResponse(null);
    try {
      const res = await aiAPI.callAssist('ai-query', q);
      if (res?.data?.assistance?.objections?.length > 0) {
        setAiResponse(res.data.assistance.objections.map((o: any) => `Q: ${o.objection || ''}\nA: ${o.response || ''}`).join('\n\n'));
      } else if (res?.data?.assistance?.suggestions?.length > 0) {
        setAiResponse(res.data.assistance.suggestions.join('\n'));
      } else {
        setAiResponse(`Query received: "${q}". Use the billing topics for specific answers.`);
      }
    } catch { setAiResponse(`Unable to process query.`); }
    setAiSearching(false);
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text).then(() => message.success('Copied!')).catch(() => {}); };
  const handleFallbackSubmit = async () => {
    if (!fallbackInput.trim()) return;
    setTranscript(fallbackInput); setConversationLog((prev: string[]) => [...prev, fallbackInput]); setFallbackInput('');
  };
  const handleNextAlternative = () => {
    const alts = flowResponse?.alternative_responses || [];
    if (alts.length === 0) return; setAlternativeIndex((prev: number) => (prev + 1) % alts.length);
  };

  const columns = [
    { title: 'Status', dataIndex: 'status', key: 'status', width: 80, render: (s: string) => { const color: Record<string, string> = { completed: 'green', queued: 'blue', ringing: 'orange', 'in-progress': 'processing', received: 'purple', failed: 'red', interested: 'green', not_interested: 'red', voicemail: 'orange', no_answer: 'default' }; return <Tag color={color[s] || 'default'}>{s}</Tag>; } },
    { title: 'Dir', dataIndex: 'direction', key: 'direction', width: 60, render: (d: string) => <Tag color={d === 'outbound' ? 'blue' : 'green'}>{d === 'outbound' ? 'Out' : 'In'}</Tag> },
    { title: 'From', dataIndex: 'from_number', key: 'from', width: 120 },
    { title: 'To', dataIndex: 'to_number', key: 'to', width: 120 },
    { title: 'Dur', dataIndex: 'duration', key: 'duration', width: 60, render: (d: number | null) => d ? `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}` : '-' },
    { title: 'Date', dataIndex: 'created_at', key: 'date', width: 130, render: (d: string) => dayjs(d).format('MMM D h:mm A') },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', width: 100, render: (n: string) => n ? <Tooltip title={n}>{n.startsWith('[OUTCOME') ? n.replace('[OUTCOME:', '').replace(']', '') : n.slice(0, 20)}</Tooltip> : '-' },
    { title: '', key: 'actions', width: 70, render: (_: any, r: CallRecord) => <Button size="small" icon={<ThunderboltOutlined />} onClick={() => handleCallAssist(r)}>AI</Button> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Title level={2}><PhoneOutlined /> AI Call Center</Title>
          <Paragraph>Browser-based softphone with AI-assisted calling</Paragraph>
        </div>
        <Space>
          <Tag color={deviceReady ? 'green' : 'orange'}>{deviceReady ? 'Phone Ready' : 'Initializing...'}</Tag>
          {callInProgress && (
            <Tag icon={<FieldTimeOutlined />} color={timer > 600 ? 'red' : timer > 300 ? 'orange' : 'green'} style={{ fontSize: 16, padding: '4px 12px' }}>
              {formatTimer(timer)} {timer > 600 && <span style={{ marginLeft: 8 }}>⏰ Running long</span>}
            </Tag>
          )}
          {callInProgress && (
            <>
              <Button icon={muted ? <AudioMutedOutlined /> : <AudioOutlined />} onClick={handleToggleMute}>{muted ? 'Unmute' : 'Mute'}</Button>
              <Button danger icon={<CloseOutlined />} onClick={handleEndCall}>End Call</Button>
            </>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadCalls}>Refresh</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          {/* Dial Pad */}
          <Card title={<Space><PhoneOutlined /> Dial Pad</Space>} style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', marginBottom: 8 }}>
              <Select value={countryCode} onChange={handleCountryCodeChange} style={{ width: 90 }}>
                <Select.Option value="+1">+1 (US)</Select.Option>
                <Select.Option value="+91">+91 (IN)</Select.Option>
                <Select.Option value="+44">+44 (UK)</Select.Option>
                <Select.Option value="+61">+61 (AU)</Select.Option>
              </Select>
              <Input value={localNumber} onChange={e => setLocalNumber(e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder={countryCode === '+1' ? '(863) 694-0325' : 'Phone number'}
                size="large" style={{ textAlign: 'center', fontSize: 16, fontFamily: 'monospace' }}
                prefix={<Text type="secondary" style={{ fontSize: 12 }}>{countryCode}</Text>} />
            </Space>
            <div style={{ textAlign: 'center' }}>
              {dialPadButtons.map((row, ri) => (
                <div key={ri} style={{ marginBottom: 6 }}>
                  {row.map(d => (
                    <Button key={d} shape="circle" size="large" onClick={() => handleDialPad(d)}
                      style={{ width: 52, height: 52, margin: '0 3px', fontSize: 16, fontWeight: d === '0' ? undefined : 500 }}>{d}</Button>
                  ))}
                </div>
              ))}
              <div style={{ marginTop: 4 }}>
                <Button size="small" icon={<DeleteOutlined />} onClick={handleDeleteDigit} style={{ marginRight: 4 }}>Back</Button>
                <Button size="small" onClick={handleClear}>Clear</Button>
              </div>
            </div>
            <Divider />
            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button type="primary" size="large" icon={<PhoneOutlined />} onClick={handleMakeCall} disabled={!localNumber || !deviceReady || callInProgress}>Call</Button>
              <Button size="large" icon={<MessageOutlined />} onClick={handleSendSMS} disabled={!localNumber}>SMS</Button>
            </Space>
          </Card>

          {/* Pre-Call Provider Briefing */}
          {(preview || previewLoading) && (
            <Card title={<Space><InfoCircleOutlined /> Provider Briefing</Space>} style={{ marginBottom: 16 }} loading={previewLoading}>
              {preview && (
                <>
                  {preview.provider && (
                    <Descriptions column={1} size="small" style={{ marginBottom: 8 }}>
                      <Descriptions.Item label="Name">{preview.provider.name || 'Unknown'}</Descriptions.Item>
                      <Descriptions.Item label="Specialty">{preview.provider.specialty || '-'}</Descriptions.Item>
                      <Descriptions.Item label="City">{preview.provider.city || '-'}</Descriptions.Item>
                      <Descriptions.Item label="NPI">{preview.provider.npi || '-'}</Descriptions.Item>
                    </Descriptions>
                  )}
                  {preview.sentiment_warning && <Alert type="warning" showIcon icon={<WarningOutlined />} message={preview.sentiment_warning} style={{ marginBottom: 8 }} />}
                  {preview?.call_history?.total_calls > 0 && (
                    <div style={{ marginBottom: 8, fontSize: 12 }}>
                      <Text strong>Call History: </Text>
                      <Tag color="blue">{preview.call_history.total_calls} past calls</Tag>
                      {preview.call_history.last_call_date && <Text type="secondary"> Last: {dayjs(preview.call_history.last_call_date).format('MMM D')}</Text>}
                    </div>
                  )}
                  {preview?.suggested_script?.objections?.length > 0 && (
                    <Collapse ghost size="small" items={[{ key: 'objections', label: `Objections (${preview.suggested_script.objections.length})`,
                      children: <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>{preview.suggested_script.objections.slice(0, 3).map((o, i) => <li key={i}><strong>{o.objection}</strong><br />{o.response}<Divider style={{ margin: '4px 0' }} /></li>)}</ul> }]} />
                  )}
                </>
              )}
            </Card>
          )}

          {/* Call Flow Assistant */}
          {callInProgress && (
            <Card title={<Space><RobotOutlined /> Call Flow Assistant</Space>} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: 13 }}>{flowResponse?.phase_label || 'Phase 1: The Hook (0-30s)'}</Text>
                <Progress percent={flowResponse?.progress_percent || 25} size="small" showInfo={false} style={{ margin: '4px 0' }} />
              </div>
              {recognitionActive ? (
                transcript ? (
                  <Alert type="info" showIcon message="Provider said:" description={<Text italic style={{ fontSize: 12 }}>{transcript}</Text>}
                    style={{ marginBottom: 8, fontSize: 12 }} closable onClose={() => setTranscript('')} />
                ) : (
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>🎤 Mic active — listening...</Text>
                )
              ) : (
                <div style={{ marginBottom: 8 }}>
                  <Button type="primary" size="small" icon={<SoundOutlined />} onClick={() => startListening()} style={{ marginBottom: 6, width: '100%' }}>
                    🎤 Enable Microphone
                  </Button>
                  <Input.Search value={fallbackInput} onChange={e => setFallbackInput(e.target.value)}
                    onSearch={handleFallbackSubmit} placeholder="Type provider response..." enterButton="Submit" size="small" />
                </div>
              )}
              {flowResponse && (
                <>
                  <div style={{ background: '#f0f5ff', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>💡 Suggested Response:</Text>
                    <Text style={{ fontSize: 12, lineHeight: 1.5 }}>{flowResponse.alternative_responses?.[alternativeIndex] || flowResponse.suggested_response}</Text>
                  </div>
                  <Space style={{ marginBottom: 6 }}>
                    <Button size="small" icon={<CopyOutlined />} onClick={() => { const t = flowResponse.alternative_responses?.[alternativeIndex] || flowResponse.suggested_response; navigator.clipboard.writeText(t).then(() => message.success('Copied!')); }}>Copy</Button>
                    {flowResponse.alternative_responses?.length > 1 && <Button size="small" onClick={handleNextAlternative}>🔄 Try Next ({alternativeIndex + 1}/{flowResponse.alternative_responses.length})</Button>}
                  </Space>
                  <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
                    {flowResponse.key_metric && <div><Tag color="blue" style={{ fontSize: 10 }}>📊 {flowResponse.key_metric}</Tag></div>}
                    {flowResponse.power_phrase && <div style={{ marginTop: 2 }}><Text italic style={{ fontSize: 11 }}>💬 "{flowResponse.power_phrase}"</Text></div>}
                    {flowResponse.next_step && <div style={{ marginTop: 2 }}>➡️ <Text strong>Next:</Text> {flowResponse.next_step}</div>}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* AI Billing Topics */}
          <Card title={<Space><RobotOutlined /> AI Billing Assistant</Space>} style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Click a topic for billing & coding answers</Text>
            <Row gutter={[4, 4]}>
              {billingTopics.map((topic, i) => (
                <Col span={12} key={i}>
                  <Button size="small" icon={topic.icon} onClick={() => handleAiQuery(topic.question)}
                    style={{ width: '100%', textAlign: 'left', fontSize: 11 }}>{topic.label}</Button>
                </Col>
              ))}
            </Row>
            <Divider />
            <Input.Search placeholder="Ask a billing question..." value={aiQuery} onChange={e => setAiQuery(e.target.value)}
              onSearch={() => handleAiQuery()} loading={aiSearching} enterButton="Ask" />
            {aiResponse && <Alert type="info" showIcon message="Billing Assistant" description={<pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{aiResponse}</pre>}
              style={{ marginTop: 8 }} closable onClose={() => setAiResponse(null)} />}
          </Card>

          {/* Live Script */}
          <Card title={<Space><SoundOutlined /> Live Script</Space>} style={{ marginBottom: 16 }}
            extra={<Button size="small" onClick={() => setShowScript(!showScript)}>{showScript ? 'Hide' : 'Show'}</Button>}>
            {showScript && (
              <Tabs size="small" items={[
                { key: 'opening', label: 'Opening', children: <div><pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f6f8fa', padding: 8, borderRadius: 4 }}>{preview?.suggested_script.opening || 'Hello, this is [Your Name] from Aethera Healthcare Solutions. Am I speaking with [Provider Name]?'}</pre><Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(preview?.suggested_script.opening || '')} style={{ marginTop: 4 }}>Copy</Button></div> },
                { key: 'value', label: 'Value Props', children: <ul style={{ paddingLeft: 16, fontSize: 12, margin: 0 }}>{(preview?.suggested_script.value_propositions || ['Revenue cycle management', 'Denial management', 'Coding compliance']).map((v, i) => <li key={i} style={{ marginBottom: 6 }}>{v}<Button size="small" type="link" icon={<CopyOutlined />} onClick={() => copyToClipboard(v)} style={{ float: 'right' }} /></li>)}</ul> },
                { key: 'objections', label: `Objections (${(preview?.suggested_script.objections || []).length || 3})`, children: <ul style={{ paddingLeft: 0, fontSize: 12, listStyle: 'none', margin: 0 }}>{(preview?.suggested_script.objections.length ? preview.suggested_script.objections : [{ objection: 'We already have a billing service', response: 'Many practices use us as a secondary audit — we find 5-8% missed revenue.' }, { objection: 'Too expensive', response: 'Free denial audit — no savings, no cost.' }, { objection: 'Not interested', response: 'May I send our monthly billing report? No obligation.' }]).map((o, i) => <li key={i} style={{ marginBottom: 8, padding: 6, background: '#f9f9f9', borderRadius: 4 }}><Text strong style={{ fontSize: 12 }}>Q: {o.objection}</Text><div style={{ fontSize: 12, marginTop: 2 }}>A: {o.response}<Button size="small" type="link" icon={<CopyOutlined />} onClick={() => copyToClipboard(o.response)} style={{ float: 'right' }} /></div></li>)}</ul> },
                { key: 'closing', label: 'Closing', children: <div>{[{title:'Schedule Follow-up',text:'Thank you. Could we schedule a follow-up call next week?'},{title:'Send Information',text:'I will send you an email with more details.'},{title:'Set Up Demo',text:'Would you be open to a 15-minute demo?'}].map((c,i) => <div key={i} style={{marginBottom:6}}><Text strong style={{fontSize:12}}>{c.title}</Text><div style={{fontSize:12,display:'flex',justifyContent:'space-between'}}><span>{c.text}</span><Button size="small" type="link" icon={<CopyOutlined />} onClick={() => copyToClipboard(c.text)} /></div></div>)}</div> }
              ]} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card>
            <Table columns={columns} dataSource={calls} rowKey="id" loading={loading} size="small"
              locale={{ emptyText: <Empty description="No calls yet. Use the dial pad to make a call." /> }}
              pagination={{ pageSize: 10, showTotal: (t) => `Total ${t} calls` }} />
          </Card>

          {selectedCall && (
            <Card title={<Space><RobotOutlined /> AI Call Assistance</Space>} style={{ marginTop: 16 }}
              extra={<Button size="small" onClick={() => { setSelectedCall(null); setCallAssistResult(null); }}>Close</Button>}>
              {assistLoading ? <Spin /> : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>From: </Text>{selectedCall.from_number}<Text strong style={{ marginLeft: 16 }}>To: </Text>{selectedCall.to_number}
                    <Text strong style={{ marginLeft: 16 }}>Status: </Text><Tag color="blue">{selectedCall.status}</Tag>
                    {selectedCall.duration && <><Text strong style={{ marginLeft: 16 }}>Duration: </Text>{Math.floor(selectedCall.duration / 60)}:{String(selectedCall.duration % 60).padStart(2, '0')}</>}
                  </div>
                  {callAssistResult && (
                    <>
                      {callAssistResult.assistance?.sentiment && <Alert type={callAssistResult.assistance.sentiment.label === 'positive' ? 'success' : callAssistResult.assistance.sentiment.label === 'negative' ? 'error' : 'info'} showIcon message={`Sentiment: ${callAssistResult.assistance.sentiment.label} (${callAssistResult.assistance.sentiment.score})`} style={{ marginBottom: 8 }} />}
                      {callAssistResult.assistance?.suggestions?.length > 0 && <Card size="small" title="Suggestions" style={{ marginBottom: 8 }}><ul style={{ margin: 0, paddingLeft: 16 }}>{callAssistResult.assistance.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></Card>}
                      {callAssistResult.assistance?.ai_summary && <Card size="small" title="AI Summary" style={{ marginBottom: 8 }}><p>{callAssistResult.assistance.ai_summary}</p></Card>}
                    </>
                  )}
                  {selectedCall.transcription && <Card size="small" title="Transcription" style={{ marginBottom: 8 }}><pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{selectedCall.transcription}</pre></Card>}
                  {selectedCall.ai_summary && !callAssistResult && <Card size="small" title="Stored Summary"><p>{selectedCall.ai_summary}</p></Card>}
                </>
              )}
            </Card>
          )}
        </Col>
      </Row>

      <Modal title="Call Completed — Save Outcome" open={outcomeModalVisible} onCancel={() => setOutcomeModalVisible(false)} footer={null}>
        <Form form={outcomeForm} layout="vertical" onFinish={handleSaveOutcome}>
          <Form.Item name="outcome" label="Outcome" rules={[{ required: true }]}>
            <Select placeholder="Select outcome">
              <Select.Option value="interested">Interested</Select.Option>
              <Select.Option value="not_interested">Not interested</Select.Option>
              <Select.Option value="followup_scheduled">Follow-up scheduled</Select.Option>
              <Select.Option value="voicemail_left">Left voicemail</Select.Option>
              <Select.Option value="wrong_number">Wrong number</Select.Option>
              <Select.Option value="no_answer">No answer</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes"><TextArea rows={3} placeholder="Key takeaways..." /></Form.Item>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>Save Outcome</Button>
            <Button type="dashed" icon={<PlusCircleOutlined />} onClick={() => handleConvertToOnboarding()}>
              Convert to Onboarding
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default Calls;