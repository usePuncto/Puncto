'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { Shift, ClockIn } from '@/types/timeClock';

export default function AdminTimeClockPage() {
  const { business } = useBusiness();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [clockIns, setClockIns] = useState<ClockIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [business?.id]);

  const loadData = async () => {
    if (!business?.id) return;

    try {
      setIsLoading(true);
      const [shiftsRes, clockInsRes] = await Promise.all([
        fetch(`/api/time-clock/shifts?businessId=${business.id}&status=active`),
        fetch(`/api/time-clock/clock-ins?businessId=${business.id}&limit=50`),
      ]);

      const shiftsData = await shiftsRes.json();
      const clockInsData = await clockInsRes.json();

      setShifts(shiftsData.shifts || []);
      setClockIns(clockInsData.clockIns || []);
    } catch (error) {
      console.error('Failed to load time clock data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">Ponto Eletrônico</h1>
        <p className="text-neutral-600 mt-2">Gerencie o controle de ponto dos funcionários</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold mb-4">Turnos Ativos</h2>
          {shifts.length === 0 ? (
            <p className="text-neutral-500">Nenhum turno ativo</p>
          ) : (
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div key={shift.id} className="p-3 border border-neutral-200 rounded-lg">
                  <p className="font-medium">Funcionário: {shift.userId}</p>
                  <p className="text-sm text-neutral-600">
                    Início: {new Date(shift.startTime as Date).toLocaleString('pt-BR')}
                  </p>
                  {shift.totalHours && (
                    <p className="text-sm text-neutral-600">
                      Horas: {shift.totalHours.toFixed(2)}h
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold mb-4">Últimos Registros</h2>
          {clockIns.length === 0 ? (
            <p className="text-neutral-500">Nenhum registro</p>
          ) : (
            <div className="space-y-2">
              {clockIns.slice(0, 10).map((clockIn) => (
                <div key={clockIn.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {clockIn.type === 'in' && 'Entrada'}
                      {clockIn.type === 'out' && 'Saída'}
                      {clockIn.type === 'break_start' && 'Início Intervalo'}
                      {clockIn.type === 'break_end' && 'Fim Intervalo'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(clockIn.timestamp as Date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {!clockIn.validated && (
                    <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                      Pendente
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
