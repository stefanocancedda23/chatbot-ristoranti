import { Routes } from '@angular/router';
import { ChatbotComponent } from './chatbot/chatbot/chatbot.component';
import { BookingPage } from './booking-page/booking-page'
export const routes: Routes = [
  {path: '', component: ChatbotComponent},
  { path: 'prenota', component: BookingPage } 
];
