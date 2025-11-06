/**
 * Servicio para guardar y recuperar borradores de respuestas
 */

import type { AnswerInput } from './publicFormService';

interface DraftData {
  formId: string;
  formSlug: string;
  formTitle: string;
  answers: Record<string, AnswerInput>;
  lastUpdated: string;
}

class DraftService {
  private readonly STORAGE_KEY = 'form_drafts';
  
  /**
   * Guarda un borrador de respuesta
   */
  saveDraft(formSlug: string, formId: string, formTitle: string, answers: Map<string, AnswerInput>): void {
    try {
      // Convertir Map a objeto para almacenamiento
      const answersObj: Record<string, AnswerInput> = {};
      answers.forEach((value, key) => {
        // Solo guardar respuestas que tengan algún valor
        if (
          (value.textAnswer && value.textAnswer.trim() !== '') || 
          (value.selectedOptions && value.selectedOptions.length > 0) ||
          value.fileUrl
        ) {
          answersObj[key] = value;
        }
      });
      
      // Si no hay respuestas, no guardar borrador
      if (Object.keys(answersObj).length === 0) {
        this.removeDraft(formSlug);
        return;
      }
      
      // Crear objeto de borrador
      const draft: DraftData = {
        formId,
        formSlug,
        formTitle,
        answers: answersObj,
        lastUpdated: new Date().toISOString()
      };
      
      // Obtener borradores existentes
      const drafts = this.getAllDrafts();
      
      // Actualizar o añadir el borrador actual
      drafts[formSlug] = draft;
      
      // Guardar en localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drafts));
      
      console.log(`Borrador guardado para formulario: ${formTitle}`);
    } catch (error) {
      console.error('Error al guardar borrador:', error);
    }
  }
  
  /**
   * Recupera un borrador de respuesta
   */
  getDraft(formSlug: string): { answers: Map<string, AnswerInput>; lastUpdated: Date } | null {
    try {
      const drafts = this.getAllDrafts();
      const draft = drafts[formSlug];
      
      if (!draft) return null;
      
      // Convertir objeto a Map
      const answersMap = new Map<string, AnswerInput>();
      Object.entries(draft.answers).forEach(([key, value]) => {
        answersMap.set(key, value);
      });
      
      return {
        answers: answersMap,
        lastUpdated: new Date(draft.lastUpdated)
      };
    } catch (error) {
      console.error('Error al recuperar borrador:', error);
      return null;
    }
  }
  
  /**
   * Elimina un borrador de respuesta
   */
  removeDraft(formSlug: string): void {
    try {
      const drafts = this.getAllDrafts();
      
      if (drafts[formSlug]) {
        delete drafts[formSlug];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drafts));
        console.log(`Borrador eliminado para formulario: ${formSlug}`);
      }
    } catch (error) {
      console.error('Error al eliminar borrador:', error);
    }
  }
  
  /**
   * Obtiene todos los borradores
   */
  private getAllDrafts(): Record<string, DraftData> {
    try {
      const draftsJson = localStorage.getItem(this.STORAGE_KEY);
      return draftsJson ? JSON.parse(draftsJson) : {};
    } catch (error) {
      console.error('Error al obtener borradores:', error);
      return {};
    }
  }
  
  /**
   * Verifica si existe un borrador para un formulario
   */
  hasDraft(formSlug: string): boolean {
    const drafts = this.getAllDrafts();
    return !!drafts[formSlug];
  }
}

export const draftService = new DraftService();
