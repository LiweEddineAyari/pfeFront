import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';import { provideHttpClient } from '@angular/common/http';import {
  LayoutDashboard, Image, FileText, Lock,
  Building2, Car, GraduationCap, Bus, ShoppingCart, Pill, Coffee,
  RefreshCw, Plus, DollarSign, MoreHorizontal,
  Bell, Clock, Settings, Search, Sun, Moon, TrendingUp,
  ChevronDown, ChevronRight, ChevronLeft, Menu, X, ArrowUp,
  Home, LayoutGrid, Info, ShoppingBag, ShoppingBasket, RefreshCcw, BusFront,
  Tv, GlassWater, LogOut,
  Server, ShieldCheck, Database, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Play, Calendar,
  XCircle, CheckCircle, AlertTriangle, FileUp, Calculator, Users, DatabaseBackup, Check, Download
} from 'lucide-angular';

import { routes } from './app.routes';

const icons = {
  LayoutDashboard, Image, FileText, Lock,
  Building2, Car, GraduationCap, Bus, ShoppingCart, Pill, Coffee,
  RefreshCw, Plus, DollarSign, MoreHorizontal,
  Bell, Clock, Settings, Search, Sun, Moon, TrendingUp,
  ChevronDown, ChevronRight, ChevronLeft, Menu, X, ArrowUp,
  Home, LayoutGrid, Info, ShoppingBag, ShoppingBasket, RefreshCcw, BusFront,
  Tv, GlassWater, LogOut,
  Server, ShieldCheck, Database, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Play, Calendar,
  XCircle, CheckCircle, AlertTriangle, FileUp, Calculator, Users, DatabaseBackup, Check, Download
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),
    provideCharts(withDefaultRegisterables()),
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider(icons),
    },
  ],
};
