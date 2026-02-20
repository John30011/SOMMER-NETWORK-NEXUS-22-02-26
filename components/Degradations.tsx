import React from 'react';
import { Activity } from 'lucide-react';

const Degradations: React.FC = () => {
  return (
    <div className="p-6 text-white min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
          <Activity className="w-6 h-6 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Degradaciones</h1>
          <p className="text-zinc-400 text-sm">Monitoreo de degradación de servicio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder content */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center h-64">
          <Activity className="w-12 h-12 text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">Sin degradaciones activas</h3>
          <p className="text-sm text-zinc-500 mt-2">No se han detectado problemas de rendimiento en la red.</p>
        </div>
      </div>
    </div>
  );
};

export default Degradations;
