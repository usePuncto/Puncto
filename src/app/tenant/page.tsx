'use client';

import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { Service, Professional } from '@/types';
import { Product } from '@/types/restaurant';
import { useAvailability } from '@/lib/hooks/useAvailability';
import { useCreateEventRegistration, useEvents } from '@/lib/queries/events';
import type { EventItem } from '@/types/event';

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const formatDate = (d: Date) =>
  d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

function formatDateBr(dateIso: string) {
  const dt = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return dateIso;
  return dt.toLocaleDateString('pt-BR');
}

function eventStatusLabel(status: EventItem['status']) {
  if (status === 'active') return 'Ativo';
  if (status === 'soon') return 'Em breve';
  return 'Inativo';
}

function eventStatusClass(status: EventItem['status']) {
  if (status === 'active') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (status === 'soon') return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-stone-300 bg-stone-50 text-stone-600';
}

const STEP_LABELS = ['Escolha', 'Data e hora', 'Seus dados', 'Confirmar'];

const isRestaurantIndustry = (industry: string | undefined) =>
  industry === 'restaurant' || industry === 'bakery' || industry === 'cafe';

export default function PublicBusinessPage() {
  const { business } = useBusiness();
  // Layout driven by industry only — salon, clinic, event, general = booking; restaurant/bakery/cafe = menu
  const isRestaurant = isRestaurantIndustry(business?.industry);
  const isEducation = business?.industry === 'education';

  const [activeTab, setActiveTab] = useState<'book' | 'events' | 'menu' | 'table' | 'gallery' | 'reviews'>(
    isRestaurant ? 'menu' : isEducation ? 'events' : 'book',
  );
  const [filterMode, setFilterMode] = useState<'service' | 'pro'>('service');

  function resetBookingFlow() {
    setStep(1);
    setSelectedService(null);
    setSelectedPro(null);
    setSelectedTime(null);
    setCreatedId(null);
  }

  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedPro, setSelectedPro] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventLeadName, setEventLeadName] = useState('');
  const [eventLeadEmail, setEventLeadEmail] = useState('');
  const [eventLeadPhone, setEventLeadPhone] = useState('');
  const [eventLeadError, setEventLeadError] = useState<string | null>(null);
  const [eventLeadSuccess, setEventLeadSuccess] = useState<string | null>(null);

  const { data: events = [], isLoading: loadingEvents } = useEvents(business?.id ?? '');
  const createEventRegistration = useCreateEventRegistration(business?.id ?? '', selectedEventId);
  const publicEvents = React.useMemo(
    () => events.filter((eventItem) => eventItem.status === 'active' || eventItem.status === 'soon'),
    [events],
  );

  useEffect(() => {
    if (!business) return;
    setActiveTab(isRestaurant ? 'menu' : isEducation ? 'events' : 'book');
  }, [business, isRestaurant, isEducation]);

  useEffect(() => {
    if (!isEducation) return;
    if (publicEvents.length === 0) {
      setSelectedEventId('');
      return;
    }
    if (!selectedEventId || !publicEvents.some((eventItem) => eventItem.id === selectedEventId)) {
      setSelectedEventId(publicEvents[0].id);
    }
  }, [isEducation, publicEvents, selectedEventId]);

  useEffect(() => {
    async function fetchData() {
      if (!business?.id) return;
      try {
        setLoading(true);
        if (isRestaurant) {
          const [menuRes, catRes] = await Promise.all([
            fetch(`/api/menu?businessId=${business.id}`),
            fetch(`/api/menu/categories?businessId=${business.id}`),
          ]);
          if (menuRes.ok) {
            const { products: p } = await menuRes.json();
            setProducts((p || []).filter((x: Product) => x.available));
          }
          if (catRes.ok) {
            const { categories: c } = await catRes.json();
            setCategories((c || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
          }
        } else if (!isEducation) {
          const servicesRef = collection(db, 'businesses', business.id, 'services');
          const servicesSnap = await getDocs(query(servicesRef, where('active', '==', true)));
          setServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));

          const prosRef = collection(db, 'businesses', business.id, 'professionals');
          const prosSnap = await getDocs(query(prosRef, where('active', '==', true), where('canBookOnline', '==', true)));
          setProfessionals(prosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional)));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [business?.id, isRestaurant]);

  const visibleServices = React.useMemo(() => {
    if (filterMode === 'service' || !selectedPro) return services;
    return services.filter(s => s.professionalIds?.includes(selectedPro));
  }, [filterMode, selectedPro, services]);

  const visibleProfessionals = React.useMemo(() => {
    if (filterMode === 'pro' || !selectedService) return professionals;
    const svc = services.find(s => s.id === selectedService);
    return svc ? professionals.filter(p => svc.professionalIds?.includes(p.id)) : professionals;
  }, [filterMode, selectedService, professionals, services]);

  const filteredProducts = React.useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const { data: availabilityData, isLoading: loadingAvailability } = useAvailability(
    selectedDate,
    selectedPro || undefined,
    selectedService || undefined
  );

  const timeSlots = React.useMemo(() => {
    if (!availabilityData) return [];
    return availabilityData
      .filter((slot) => slot.available)
      .map((slot) => new Date(slot.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  }, [availabilityData]);

  const currentService = React.useMemo(() => services.find(s => s.id === selectedService) || null, [selectedService, services]);
  const currentPro = React.useMemo(() => professionals.find(p => p.id === selectedPro) || null, [selectedPro, professionals]);

  function canContinueStep1() {
    if (filterMode === 'service') return Boolean(selectedService && (selectedPro || !currentService?.professionalIds?.length));
    return Boolean(selectedPro && selectedService);
  }

  function isProfessionalValidForService() {
    if (!currentService || !currentPro) return false;
    const ids = currentService.professionalIds ?? [];
    return ids.length === 0 || ids.includes(currentPro.id);
  }

  function onContinue() {
    if (step === 1 && canContinueStep1()) setStep(2);
    else if (step === 2 && selectedTime) setStep(3);
    else if (step === 3 && firstName && lastName && phone) setStep(4);
  }

  function onBack() { if (step > 1) setStep(step - 1); }

  async function submitBooking() {
    if (!currentService || !currentPro) return;
    if (!isProfessionalValidForService()) {
      alert('O profissional selecionado não oferece este serviço. Por favor, escolha outro.');
      return;
    }
    setSubmitting(true);
    try {
      // Ensure customer exists in business (auto-register from booking form data)
      let customerId: string | null = null;
      try {
        const ensureRes = await fetch('/api/customers/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business!.id,
            firstName,
            lastName,
            phone,
            email: email || '',
          }),
        });
        if (ensureRes.ok) {
          const { customerId: cid } = await ensureRes.json();
          customerId = cid || customerId;
        }
      } catch {
        // Non-blocking: booking continues with customerData
      }

      const bookingsRef = collection(db, 'businesses', business!.id, 'bookings');
      const docRef = await addDoc(bookingsRef, {
        businessId: business!.id,
        serviceId: currentService.id,
        serviceName: currentService.name,
        professionalId: currentPro.id,
        professionalName: currentPro.name,
        locationId: currentPro.locationIds?.[0] || '',
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        scheduledDateTime: Timestamp.fromDate(new Date(`${selectedDate}T${selectedTime}`)),
        durationMinutes: currentService.durationMinutes,
        endDateTime: Timestamp.fromDate(new Date(new Date(`${selectedDate}T${selectedTime}`).getTime() + (currentService.durationMinutes || 60) * 60000)),
        customerId,
        customerData: { firstName, lastName, phone, email: email || '' },
        status: 'pending',
        price: currentService.price,
        currency: currentService.currency,
        notes,
        reminders: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      setCreatedId(docRef.id);

      // Create in-app notifications (fallback when Cloud Functions aren't running)
      try {
        await fetch('/api/bookings/create-notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: business!.id, bookingId: docRef.id }),
        });
      } catch {
        // Non-blocking: notifications may also be created by Cloud Function
      }

      setStep(5);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50/80">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-stone-300 border-t-[var(--brand-primary)] animate-spin" />
          <p className="text-sm text-stone-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  const serviceTabs = [
    { key: 'book' as const, label: 'Agendar' },
    { key: 'gallery' as const, label: 'Galeria' },
    { key: 'reviews' as const, label: 'Avaliações' },
  ];
  const educationTabs = [
    { key: 'events' as const, label: 'Eventos' },
    { key: 'gallery' as const, label: 'Galeria' },
    { key: 'reviews' as const, label: 'Avaliações' },
  ];
  const restaurantTabs = [
    { key: 'menu' as const, label: 'Cardápio' },
    { key: 'table' as const, label: 'Na mesa' },
    { key: 'gallery' as const, label: 'Galeria' },
    { key: 'reviews' as const, label: 'Avaliações' },
  ];
  const tabs = isRestaurant ? restaurantTabs : isEducation ? educationTabs : serviceTabs;

  const selectedEvent = publicEvents.find((eventItem) => eventItem.id === selectedEventId) || null;

  const handleSubmitEventLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventLeadError(null);
    setEventLeadSuccess(null);

    if (!selectedEventId) {
      setEventLeadError('Selecione um evento para continuar.');
      return;
    }
    if (!selectedEvent || selectedEvent.status !== 'active') {
      setEventLeadError('Este evento não está com inscrições ativas no momento.');
      return;
    }
    if (!eventLeadName.trim()) {
      setEventLeadError('Informe seu nome.');
      return;
    }
    if (!eventLeadPhone.trim()) {
      setEventLeadError('Informe seu telefone.');
      return;
    }
    if (!eventLeadEmail.trim()) {
      setEventLeadError('Informe seu e-mail.');
      return;
    }

    try {
      await createEventRegistration.mutateAsync({
        name: eventLeadName,
        phone: eventLeadPhone,
        email: eventLeadEmail,
      });
      setEventLeadName('');
      setEventLeadPhone('');
      setEventLeadEmail('');
      setEventLeadSuccess('Pré-cadastro enviado com sucesso!');
    } catch (error) {
      setEventLeadError(error instanceof Error ? error.message : 'Não foi possível enviar seu pré-cadastro.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/80 text-stone-900 font-sans antialiased">
      {/* Hero */}
      <div className="relative h-64 md:h-72 w-full overflow-hidden">
        <img
          src={business?.branding?.coverUrl || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop'}
          alt={business?.displayName || ''}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {business?.branding?.logoUrl && (
                <img src={business.branding.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/20 shadow-xl" />
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{business?.displayName}</h1>
                <p className="text-stone-200 text-sm mt-0.5">
                  {business?.address?.street}, {business?.address?.number} · {business?.address?.city}/{business?.address?.state}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-black/20 px-3 py-2 text-sm text-stone-100">
              Atendimento por ordem de envio do formulário
            </div>
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.key ? 'border-[var(--brand-primary)] text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
        {/* Restaurant: Cardápio */}
        {isRestaurant && activeTab === 'menu' && (
          <section className="space-y-6">
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    !selectedCategory ? 'bg-[var(--brand-primary)] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedCategory === cat.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm">
                  {product.imageUrl && (
                    <div className="relative aspect-[4/3] bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-stone-900">{product.name}</h3>
                    {product.description && <p className="text-sm text-stone-500 mt-1 line-clamp-2">{product.description}</p>}
                    <p className="text-lg font-bold text-stone-900 mt-2">{money(product.price)}</p>
                  </div>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center">
                <p className="text-stone-500">Nenhum item no cardápio no momento.</p>
              </div>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm text-amber-900">
                <strong>No restaurante?</strong> Escaneie o QR code na sua mesa para fazer pedidos diretamente.
              </p>
            </div>
          </section>
        )}

        {/* Restaurant: Na mesa */}
        {isRestaurant && activeTab === 'table' && (
          <section className="bg-white rounded-2xl border border-stone-200/80 p-8 shadow-sm text-center">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center text-4xl mx-auto mb-6">📱</div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">Fazer pedido na mesa</h2>
            <p className="text-stone-600 text-sm max-w-md mx-auto mb-6">
              Escaneie o QR code disponível na sua mesa para acessar o cardápio digital e fazer seu pedido. Prático e sem fila.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-sm">
              <span>Procure o QR code na mesa</span>
            </div>
            <div className="mt-8 pt-6 border-t border-stone-100 text-left max-w-md mx-auto">
              <p className="text-xs text-stone-500 mb-2">Precisa de ajuda?</p>
              <p><a href={`tel:${business?.phone}`} className="text-[var(--brand-secondary)] hover:underline font-medium">{business?.phone}</a></p>
              <p className="text-sm text-stone-600 mt-1">{business?.address?.street}, {business?.address?.number}</p>
              <p className="text-sm text-stone-600">{business?.address?.city}/{business?.address?.state}</p>
            </div>
          </section>
        )}

        {/* Service: Booking flow */}
        {!isRestaurant && activeTab === 'book' && (
          <div className="flex flex-col lg:flex-row gap-8">
            <section className="flex-1 min-w-0">
              {step < 5 && (
                <div className="flex items-center gap-2 mb-8">
                  {STEP_LABELS.map((label, i) => {
                    const s = i + 1;
                    const isActive = step === s;
                    const isDone = step > s;
                    return (
                      <React.Fragment key={s}>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium shrink-0 transition-colors ${isActive || isDone ? 'bg-[var(--brand-primary)] text-white' : 'bg-stone-200 text-stone-500'}`}>
                            {isDone ? '✓' : s}
                          </div>
                          <span className={`text-xs font-medium hidden sm:inline ${isActive ? 'text-stone-900' : 'text-stone-500'}`}>{label}</span>
                        </div>
                        {s < 4 && <div className={`flex-1 h-0.5 min-w-2 ${isDone ? 'bg-[var(--brand-primary)]' : 'bg-stone-200'}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {step < 5 && (
                <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-stone-900 mb-4">{STEP_LABELS[0]}</h2>
                  <div className="flex gap-2 p-1 bg-stone-100 rounded-xl mb-6">
                    <button
                      onClick={() => { setFilterMode('service'); setSelectedService(null); setSelectedPro(null); }}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${filterMode === 'service' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
                    >
                      Por serviço
                    </button>
                    <button
                      onClick={() => { setFilterMode('pro'); setSelectedPro(null); setSelectedService(null); }}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${filterMode === 'pro' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
                    >
                      Por profissional
                    </button>
                  </div>

                  {filterMode === 'service' ? (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        {visibleServices.length === 0 ? (
                          <p className="text-stone-500 text-sm py-4">Nenhum serviço disponível.</p>
                        ) : (
                          visibleServices.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                const next = selectedService === s.id ? null : s.id;
                                setSelectedService(next);
                                if (!next) setSelectedPro(null);
                              else if (s.professionalIds?.length) {
                                const ids = s.professionalIds;
                                setSelectedPro(selectedPro && ids.includes(selectedPro) ? selectedPro : ids[0]);
                                } else setSelectedPro(null);
                              }}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedService === s.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-stone-200 hover:border-stone-300 bg-white'}`}
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-stone-900 break-words">{s.name}</p>
                                  <p className="text-sm text-stone-500 mt-0.5">{money(s.price)} · {s.durationMinutes} min</p>
                                  {s.description && <p className="text-xs text-stone-400 mt-1 line-clamp-2">{s.description}</p>}
                                </div>
                                <span className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${selectedService === s.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-stone-100 text-stone-600'}`}>{selectedService === s.id ? 'Selecionado' : 'Selecionar'}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                      {selectedService && (
                        <div className="pt-4 border-t border-stone-100">
                          <h4 className="text-sm font-medium text-stone-700 mb-3">Escolha o profissional</h4>
                          {visibleProfessionals.length === 0 ? (
                            <p className="text-stone-500 text-sm py-2">Nenhum profissional disponível para este serviço.</p>
                          ) : (
                            <div className="grid gap-3 grid-cols-2 w-full">
                              {visibleProfessionals.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => setSelectedPro(selectedPro === p.id ? null : p.id)}
                                  className={`w-full min-w-0 p-4 rounded-xl border-2 transition-all text-left h-full ${selectedPro === p.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-stone-200 hover:border-stone-300'}`}
                                >
                                  <div className="flex gap-3 items-start">
                                    {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" /> : <div className="h-12 w-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-sm font-medium shrink-0">{p.name.charAt(0)}</div>}
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-stone-900 break-words">{p.name}</p>
                                      <p className="text-xs text-stone-500 break-words mt-0.5">{p.rating && `★ ${p.rating.toFixed(1)}`} {p.specialties?.length ? `· ${p.specialties.join(', ')}` : ''}</p>
                                    </div>
                                    <span className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium ${selectedPro === p.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-stone-100 text-stone-600'}`}>{selectedPro === p.id ? '✓' : 'Escolher'}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-3 grid-cols-2">
                      {visibleProfessionals.length === 0 ? (
                        <p className="text-stone-500 text-sm py-4 col-span-2">Nenhum profissional disponível.</p>
                      ) : (
                        <div className="space-y-6 col-span-2">
                          <div className="grid gap-3 grid-cols-2 w-full">
                            {visibleProfessionals.map((p) => (
                              <button
                                key={p.id}
                                className={`w-full min-w-0 p-4 rounded-xl border-2 transition-all text-left h-full ${selectedPro === p.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-stone-200 hover:border-stone-300'}`}
                                onClick={() => {
                                  const next = selectedPro === p.id ? null : p.id;
                                  setSelectedPro(next);
                                  if (!next) setSelectedService(null);
                                }}
                              >
                                <div className="flex gap-3 items-start">
                                  {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" /> : <div className="h-12 w-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-sm font-medium shrink-0">{p.name.charAt(0)}</div>}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-stone-900 break-words">{p.name}</p>
                                    <p className="text-xs text-stone-500 break-words mt-0.5">{p.rating && `★ ${p.rating.toFixed(1)}`} {p.specialties?.length ? `· ${p.specialties.join(', ')}` : ''}</p>
                                  </div>
                                  <span className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium ${selectedPro === p.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-stone-100 text-stone-600'}`}>{selectedPro === p.id ? '✓' : 'Escolher'}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                          {selectedPro && (
                            <div className="pt-4 border-t border-stone-100">
                              <h4 className="text-sm font-medium text-stone-700 mb-3 break-words">Serviços de {currentPro?.name}</h4>
                              {visibleServices.length === 0 ? (
                                <p className="text-stone-500 text-sm py-2">Este profissional não possui serviços cadastrados.</p>
                              ) : (
                                <div className="space-y-2">
                                  {visibleServices.map((s) => (
                                    <button
                                      key={s.id}
                                      onClick={() => setSelectedService(selectedService === s.id ? null : s.id)}
                                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedService === s.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-stone-200 hover:border-stone-300 bg-white'}`}
                                    >
                                      <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-stone-900 break-words">{s.name}</p>
                                          <p className="text-sm text-stone-500 mt-0.5">{money(s.price)} · {s.durationMinutes} min</p>
                                          {s.description && <p className="text-xs text-stone-400 mt-1 line-clamp-2">{s.description}</p>}
                                        </div>
                                        <span className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${selectedService === s.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-stone-100 text-stone-600'}`}>{selectedService === s.id ? 'Selecionado' : 'Selecionar'}</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between mt-6 pt-4 border-t border-stone-100">
                    <button onClick={onBack} disabled={step === 1} className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed">Voltar</button>
                    <button onClick={onContinue} disabled={!canContinueStep1() || !isProfessionalValidForService()} className="px-5 py-2.5 text-sm font-medium bg-[var(--brand-primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">Continuar</button>
                  </div>
                </div>
              )}

              {step >= 2 && step < 5 && (
                <div className="mt-6 bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-stone-900 mb-4">Escolha data e horário</h3>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Data</label>
                      <input type="date" min={new Date().toISOString().slice(0, 10)} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-stone-500 mb-1">Horários</label>
                      <div className="flex flex-wrap gap-2">
                        {loadingAvailability && <span className="text-sm text-stone-500">Carregando...</span>}
                        {!loadingAvailability && timeSlots.length === 0 && <span className="text-sm text-stone-500">{selectedService && selectedPro ? 'Nenhum horário disponível.' : 'Selecione serviço e profissional.'}</span>}
                        {!loadingAvailability && timeSlots.map((t) => (
                          <button key={t} onClick={() => setSelectedTime(t)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedTime === t ? 'bg-[var(--brand-primary)] text-white' : 'border border-stone-200 hover:border-stone-300'}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-6 pt-4 border-t border-stone-100">
                    <button onClick={onBack} className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900">Voltar</button>
                    <button onClick={onContinue} disabled={!selectedTime} className="px-5 py-2.5 text-sm font-medium bg-[var(--brand-primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">Continuar</button>
                  </div>
                </div>
              )}

              {step >= 3 && step < 5 && (
                <div className="mt-6 bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-stone-900 mb-4">Seus dados</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="block text-xs font-medium text-stone-500 mb-1">Nome</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Seu nome" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none" /></div>
                    <div><label className="block text-xs font-medium text-stone-500 mb-1">Sobrenome</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sobrenome" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none" /></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-stone-500 mb-1">Telefone (WhatsApp)</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none" /></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-stone-500 mb-1">E-mail (opcional)</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none" /></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-stone-500 mb-1">Observações (opcional)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alergias, preferências..." rows={3} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none resize-none" /></div>
                  </div>
                  <div className="flex justify-between mt-6 pt-4 border-t border-stone-100">
                    <button onClick={onBack} className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900">Voltar</button>
                    <button onClick={onContinue} disabled={!firstName || !lastName || !phone} className="px-5 py-2.5 text-sm font-medium bg-[var(--brand-primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">Revisar</button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="mt-6 bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-stone-900 mb-4">Revise seu agendamento</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-stone-500">Serviço</dt><dd className="font-medium">{currentService?.name}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">Profissional</dt><dd className="font-medium">{currentPro?.name}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">Data</dt><dd className="font-medium">{formatDate(new Date(selectedDate))}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">Horário</dt><dd className="font-medium">{selectedTime}</dd></div>
                    <div className="flex justify-between pt-2 border-t border-stone-100"><dt className="text-stone-500">Valor</dt><dd className="font-semibold text-stone-900">{currentService ? money(currentService.price) : '—'}</dd></div>
                  </dl>
                  <p className="mt-4 text-xs text-stone-500">Ao confirmar, você concorda com a{' '}
                    <button type="button" onClick={() => setShowCancellationPolicy(true)} className="text-[var(--brand-secondary)] hover:underline">
                      política de cancelamento
                    </button>
                    {' '}do estabelecimento.</p>
                  {showCancellationPolicy && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCancellationPolicy(false)}>
                      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h4 className="text-lg font-semibold text-stone-900 mb-3">Política de cancelamento</h4>
                        <p className="text-sm text-stone-600 whitespace-pre-wrap">
                          {business?.settings?.cancellationPolicy?.text?.trim() || 'O estabelecimento ainda não definiu uma política de cancelamento.'}
                        </p>
                        <button type="button" onClick={() => setShowCancellationPolicy(false)} className="mt-4 w-full py-2 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800">
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between mt-6 pt-4 border-t border-stone-100">
                    <button onClick={onBack} className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900">Voltar</button>
                    <button onClick={submitBooking} disabled={submitting} className="px-6 py-2.5 text-sm font-medium bg-[var(--brand-primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-70 transition-opacity">{submitting ? 'Enviando...' : 'Confirmar agendamento'}</button>
                  </div>
                </div>
              )}

              {step === 5 && createdId && (
                <div className="bg-white rounded-2xl border border-stone-200/80 p-8 shadow-sm text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-2xl mx-auto mb-4">✓</div>
                  <h3 className="text-xl font-semibold text-stone-900 mb-2">Agendamento criado!</h3>
                  <p className="text-stone-600 text-sm mb-6">Guarde o código da reserva: <span className="font-mono text-stone-900 font-medium">{createdId}</span>. {email ? 'Enviaremos uma confirmação antes do seu agendamento.' : 'Informe seu e-mail na próxima vez para receber confirmação.'}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {/* <AddToCalendar booking={{ id: createdId, businessId: business!.id, serviceId: currentService?.id || '', serviceName: currentService?.name || '', professionalId: currentPro?.id || '', professionalName: currentPro?.name || '', locationId: '', scheduledDate: selectedDate, scheduledTime: selectedTime || '', scheduledDateTime: new Date(`${selectedDate}T${selectedTime}`), durationMinutes: currentService?.durationMinutes || 60, endDateTime: new Date(`${selectedDate}T${selectedTime}`), customerData: { firstName, lastName, phone, email: email || user?.email }, status: 'pending', price: currentService?.price || 0, currency: 'BRL', reminders: {}, createdAt: new Date(), updatedAt: new Date() }} business={business!} /> */}
                    <button onClick={resetBookingFlow} className="px-5 py-2.5 text-sm font-medium bg-[var(--brand-primary)] text-white rounded-xl hover:opacity-90 transition-opacity">Fazer outro agendamento</button>
                    <a href="#" className="px-4 py-2.5 text-sm font-medium text-[var(--brand-secondary)] hover:underline">Ver meus agendamentos</a>
                  </div>
                </div>
              )}
            </section>

            {(step < 5 || (step === 5 && createdId)) && (currentService || currentPro) && (
              <aside className="lg:w-80 shrink-0">
                <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
                  <h4 className="text-sm font-semibold text-stone-900 mb-4">Resumo</h4>
                  <div className="space-y-3 text-sm">
                    {currentService && <div><p className="text-stone-500">Serviço</p><p className="font-medium text-stone-900 break-words">{currentService.name} · {money(currentService.price)}</p></div>}
                    {currentPro && <div><p className="text-stone-500">Profissional</p><p className="font-medium text-stone-900 break-words">{currentPro.name}</p></div>}
                    {step >= 2 && selectedDate && <div><p className="text-stone-500">Data</p><p className="font-medium text-stone-900">{formatDate(new Date(selectedDate))} {selectedTime && `· ${selectedTime}`}</p></div>}
                  </div>
                  <div className="mt-6 pt-4 border-t border-stone-100 space-y-2 text-xs text-stone-500">
                    <p><a href={`tel:${business?.phone}`} className="text-[var(--brand-secondary)] hover:underline">{business?.phone}</a></p>
                    <p>{business?.address?.street}, {business?.address?.number}</p>
                    <p>{business?.address?.city}/{business?.address?.state}</p>
                  </div>
                  {business?.about && <div className="mt-4 pt-4 border-t border-stone-100"><p className="text-xs font-medium text-stone-500 mb-1">Sobre</p><p className="text-xs text-stone-600 line-clamp-3">{business.about}</p></div>}
                </div>
              </aside>
            )}
          </div>
        )}

        {/* Education: Event pre-registration flow */}
        {isEducation && activeTab === 'events' && (
          <section className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-stone-900">Eventos disponíveis</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Selecione um evento e preencha o formulário para garantir seu pré-cadastro.
                </p>

                {loadingEvents ? (
                  <div className="mt-5 flex items-center gap-3 text-sm text-stone-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
                    Carregando eventos...
                  </div>
                ) : publicEvents.length === 0 ? (
                  <p className="mt-5 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                    Ainda não há eventos publicados.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {publicEvents.map((eventItem) => {
                      const selected = selectedEventId === eventItem.id;
                      return (
                        <li key={eventItem.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedEventId(eventItem.id)}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              selected
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                                : 'border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <p className="font-medium text-stone-900">{eventItem.name}</p>
                            <p className="mt-1 text-xs text-stone-500">
                              {formatDateBr(eventItem.date)} · {eventItem.location}
                            </p>
                            <span
                              className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${eventStatusClass(eventItem.status)}`}
                            >
                              {eventStatusLabel(eventItem.status)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-stone-900">Pré-cadastro para evento</h2>
                {!selectedEvent ? (
                  <p className="mt-3 text-sm text-stone-500">Selecione um evento para preencher seu pré-cadastro.</p>
                ) : (
                  <>
                    <div className="mt-4 rounded-xl bg-stone-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-stone-500">Evento selecionado</p>
                      <p className="mt-1 text-base font-semibold text-stone-900">{selectedEvent.name}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {formatDateBr(selectedEvent.date)} · {selectedEvent.location}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${eventStatusClass(selectedEvent.status)}`}
                      >
                        {eventStatusLabel(selectedEvent.status)}
                      </span>
                    </div>

                    <form onSubmit={handleSubmitEventLead} className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-stone-500">Nome</label>
                        <input
                          type="text"
                          value={eventLeadName}
                          onChange={(e) => setEventLeadName(e.target.value)}
                          placeholder="Seu nome completo"
                          className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-stone-500">E-mail</label>
                        <input
                          type="email"
                          value={eventLeadEmail}
                          onChange={(e) => setEventLeadEmail(e.target.value)}
                          placeholder="voce@email.com"
                          className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-stone-500">Telefone</label>
                        <input
                          type="tel"
                          value={eventLeadPhone}
                          onChange={(e) => setEventLeadPhone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={createEventRegistration.isPending || selectedEvent.status !== 'active'}
                          className="rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {createEventRegistration.isPending
                            ? 'Enviando...'
                            : selectedEvent.status === 'active'
                              ? 'Enviar pré-cadastro'
                              : 'Inscrições em breve'}
                        </button>
                      </div>
                    </form>
                    {selectedEvent.status !== 'active' && (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Este evento está marcado como "Em breve". O cadastro será liberado quando ele ficar ativo.
                      </p>
                    )}

                    {eventLeadError && (
                      <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {eventLeadError}
                      </p>
                    )}
                    {eventLeadSuccess && (
                      <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {eventLeadSuccess}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'gallery' && (
          <section className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">Galeria</h3>
            {business?.branding?.gallery && business.branding.gallery.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {business.branding.gallery.map((src, i) => (
                  <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
            ) : (
              <p className="text-stone-500 text-sm py-8 text-center">Nenhuma foto disponível.</p>
            )}
          </section>
        )}

        {activeTab === 'reviews' && (
          <section className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">Avaliações ({business?.reviewsCount || 0})</h3>
            <p className="text-stone-500 text-sm">Sistema de avaliações em breve.</p>
          </section>
        )}
      </main>
    </div>
  );
}
