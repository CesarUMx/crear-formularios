import pdf from 'pdf-parse';
import fs from 'fs/promises';

interface PDFInfo {
  pages: number;
  text: string;
  info: any;
}

class PDFService {
  /**
   * Extrae texto de un archivo PDF
   */
  async extractText(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return data.text;
    } catch (error) {
      console.error('Error al extraer texto del PDF:', error);
      throw new Error('Error al procesar el archivo PDF');
    }
  }

  /**
   * Extrae texto de un buffer PDF
   */
  async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error('Error al extraer texto del PDF:', error);
      throw new Error('Error al procesar el archivo PDF');
    }
  }

  /**
   * Valida que el archivo sea un PDF válido
   */
  async validatePDF(filePath: string): Promise<boolean> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      await pdf(dataBuffer);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Obtiene información del PDF
   */
  async getPDFInfo(filePath: string): Promise<PDFInfo> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return {
        pages: data.numpages,
        text: data.text,
        info: data.info,
      };
    } catch (error) {
      console.error('Error al obtener información del PDF:', error);
      throw new Error('Error al procesar el archivo PDF');
    }
  }
}

export const pdfService = new PDFService();

// Export types
export type { PDFInfo };
