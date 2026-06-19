import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { provideHttpClient } from '@angular/common/http';
import {
  LayoutDashboard, Image, FileText, Lock,
  Building2, Car, GraduationCap, Bus, ShoppingCart, Pill, Coffee,
  RefreshCw, Plus, DollarSign, MoreHorizontal,
  Bell, Clock, Settings, Search, Sun, Moon, TrendingUp,
  ChevronDown, ChevronRight, ChevronLeft, Menu, X, ArrowUp,
  Home, LayoutGrid, Info, ShoppingBag, ShoppingBasket, RefreshCcw, BusFront,
  Tv, GlassWater, LogOut,
  Server, ShieldCheck, Database, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Play, Calendar,
  XCircle, CheckCircle, AlertTriangle, FileUp, Calculator, Users, DatabaseBackup, Check, Download,
  Trash2, ChevronsUpDown, Percent, Sparkles, FlaskConical,
  List, Folder, Tag, Gauge, Settings2, Braces, FileCode, CheckCheck,
  ArrowDown, TrendingDown, Filter, Hash, Zap, BarChart3, Target, SlidersHorizontal,
  ListChecks, Activity, Eye, Equal, Pencil, Wand2, Scale, Minus, ArrowUpRight, ArrowDownRight,
  Beaker, Atom, GitCompareArrows, Loader2,
  Lightbulb, Copy, MessageSquare, Bot, Send, Square, BookOpen, Wrench, Droplet, Shield,
  EyeOff, Mail, KeyRound, UserPlus, UserCog, UserCheck, UserX, Ban, LogIn, ShieldAlert,
  AtSign, Fingerprint, MailCheck, RotateCcw, UserRound, MoreVertical, CircleUser
} from 'lucide-angular';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { installAuthFetch } from './core/auth/auth-fetch';

const icons = {
  LayoutDashboard, Image, FileText, Lock,
  Building2, Car, GraduationCap, Bus, ShoppingCart, Pill, Coffee,
  RefreshCw, Plus, DollarSign, MoreHorizontal,
  Bell, Clock, Settings, Search, Sun, Moon, TrendingUp,
  ChevronDown, ChevronRight, ChevronLeft, Menu, X, ArrowUp,
  Home, LayoutGrid, Info, ShoppingBag, ShoppingBasket, RefreshCcw, BusFront,
  Tv, GlassWater, LogOut,
  Server, ShieldCheck, Database, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Play, Calendar,
  XCircle, CheckCircle, AlertTriangle, FileUp, Calculator, Users, DatabaseBackup, Check, Download,
  Trash2, ChevronsUpDown, Percent, Sparkles, FlaskConical,
  List, Folder, Tag, Gauge, Settings2, Braces, FileCode, CheckCheck,
  ArrowDown, TrendingDown, Filter, Hash, Zap, BarChart3, Target, SlidersHorizontal,
  ListChecks, Activity, Eye, Equal, Pencil, Wand2, Scale, Minus, ArrowUpRight, ArrowDownRight,
  Beaker, Atom, GitCompareArrows, Loader2,
  Lightbulb, Copy, MessageSquare, Bot, Send, Square, BookOpen, Wrench, Droplet, Shield,
  EyeOff, Mail, KeyRound, UserPlus, UserCog, UserCheck, UserX, Ban, LogIn, ShieldAlert,
  AtSign, Fingerprint, MailCheck, RotateCcw, UserRound, MoreVertical, CircleUser
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
    {
      // Install the token-aware fetch wrapper and restore any persisted session
      // before the first component renders.
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (auth: AuthService) => () => {
        installAuthFetch(auth);
        auth.bootstrap();
      },
      deps: [AuthService],
    },
  ],
};
