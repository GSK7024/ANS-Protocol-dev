
import { VerificationAdapter } from '../types';
import { TravelAdapter } from './adapters/travel';
import { TransportAdapter } from './adapters/transport';
import { GenericAdapter } from './adapters/generic';

export class AdapterFactory {
    private static adapters: Map<string, VerificationAdapter> = new Map();

    static initialize() {
        this.register(TravelAdapter);
        this.register(TransportAdapter);
        this.register(GenericAdapter); // Register Generic
    }

    private static register(adapter: VerificationAdapter) {
        this.adapters.set(adapter.category, adapter);
    }

    static getAdapter(category: string): VerificationAdapter {
        // Return specific adapter if found, otherwise use Generic
        return this.adapters.get(category) || GenericAdapter;
    }
}

// Initialize on load
AdapterFactory.initialize();
