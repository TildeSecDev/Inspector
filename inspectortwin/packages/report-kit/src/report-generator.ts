import { writeFileSync } from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { RunResult, Finding, Graph, Scenario } from '@inspectortwin/shared';

export interface ReportData {
  runResult: RunResult;
  scenario: Scenario;
  graph: Graph;
  projectName?: string;
}

export interface ReportOptions {
  outputPath: string;
  format: 'json' | 'pdf';
  includeEvents?: boolean;
  includeMetrics?: boolean;
}

export class ReportGenerator {
  async generateReport(data: ReportData, options: ReportOptions): Promise<string> {
    if (options.format === 'json') {
      return this.generateJSONReport(data, options);
    } else {
      return this.generatePDFReport(data, options);
    }
  }

  private generateJSONReport(data: ReportData, options: ReportOptions): string {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        projectName: data.projectName,
        scenarioName: data.scenario.name,
        runId: data.runResult.id,
      },
      summary: {
        status: data.runResult.status,
        startedAt: data.runResult.startedAt,
        finishedAt: data.runResult.finishedAt,
        totalFindings: data.runResult.findings.length,
        criticalFindings: data.runResult.findings.filter((f: Finding) => f.severity === 'critical').length,
        highFindings: data.runResult.findings.filter((f: Finding) => f.severity === 'high').length,
      },
      topology: {
        nodeCount: data.graph.nodes.length,
        linkCount: data.graph.links.length,
        nodes: data.graph.nodes.map((n: any) => ({
          id: n.id,
          type: n.type,
          label: n.label,
          criticality: n.riskCriticality,
        })),
      },
      findings: data.runResult.findings.map((f: Finding) => ({
        severity: f.severity,
        title: f.title,
        description: f.description,
        affectedNodes: f.affectedNodeIds,
        remediation: f.remediation,
      })),
      metrics: options.includeMetrics ? data.runResult.metrics : undefined,
      events: options.includeEvents ? data.runResult.events : undefined,
    };

    const json = JSON.stringify(report, null, 2);
    writeFileSync(options.outputPath, json, 'utf-8');
    return options.outputPath;
  }

  private async generatePDFReport(data: ReportData, options: ReportOptions): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595, 842]); // A4 size
    let yPosition = 800;
    const margin = 50;
    const lineHeight = 15;

    // Title
    page.drawText('Inspector Twin - Security Assessment Report', {
      x: margin,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight * 2;

    // Metadata
    page.drawText(`Project: ${data.projectName || 'Unnamed'}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font,
    });
    yPosition -= lineHeight;

    page.drawText(`Scenario: ${data.scenario.name}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font,
    });
    yPosition -= lineHeight;

    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: margin,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    yPosition -= lineHeight * 2;

    // Summary
    page.drawText('Summary', {
      x: margin,
      y: yPosition,
      size: 14,
      font: boldFont,
    });
    yPosition -= lineHeight * 1.5;

    const criticalCount = data.runResult.findings.filter((f: Finding) => f.severity === 'critical').length;
    const highCount = data.runResult.findings.filter((f: Finding) => f.severity === 'high').length;
    const mediumCount = data.runResult.findings.filter((f: Finding) => f.severity === 'medium').length;

    page.drawText(`Total Findings: ${data.runResult.findings.length}`, {
      x: margin + 20,
      y: yPosition,
      size: 11,
      font,
    });
    yPosition -= lineHeight;

    page.drawText(`Critical: ${criticalCount} | High: ${highCount} | Medium: ${mediumCount}`, {
      x: margin + 20,
      y: yPosition,
      size: 11,
      font,
    });
    yPosition -= lineHeight * 2;

    // Topology Overview
    page.drawText('Topology Overview', {
      x: margin,
      y: yPosition,
      size: 14,
      font: boldFont,
    });
    yPosition -= lineHeight * 1.5;

    page.drawText(`Nodes: ${data.graph.nodes.length} | Links: ${data.graph.links.length}`, {
      x: margin + 20,
      y: yPosition,
      size: 11,
      font,
    });
    yPosition -= lineHeight * 2;

    // Findings
    page.drawText('Findings', {
      x: margin,
      y: yPosition,
      size: 14,
      font: boldFont,
    });
    yPosition -= lineHeight * 1.5;

    for (const finding of data.runResult.findings) {
      // Check if we need a new page
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = 800;
      }

      // Severity color
      let severityColor = rgb(0, 0, 0);
      if (finding.severity === 'critical') severityColor = rgb(0.8, 0, 0);
      else if (finding.severity === 'high') severityColor = rgb(1, 0.5, 0);
      else if (finding.severity === 'medium') severityColor = rgb(1, 0.8, 0);

      page.drawText(`[${finding.severity.toUpperCase()}] ${finding.title}`, {
        x: margin + 20,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: severityColor,
      });
      yPosition -= lineHeight;

      // Description (word wrap)
      const descWords = finding.description.split(' ');
      let line = '';
      for (const word of descWords) {
        const testLine = line + word + ' ';
        if (testLine.length > 70) {
          page.drawText(line, {
            x: margin + 40,
            y: yPosition,
            size: 9,
            font,
          });
          yPosition -= lineHeight * 0.8;
          line = word + ' ';

          if (yPosition < 100) {
            page = pdfDoc.addPage([595, 842]);
            yPosition = 800;
          }
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, {
          x: margin + 40,
          y: yPosition,
          size: 9,
          font,
        });
        yPosition -= lineHeight * 0.8;
      }

      if (finding.remediation) {
        page.drawText(`Remediation: ${finding.remediation.substring(0, 80)}`, {
          x: margin + 40,
          y: yPosition,
          size: 9,
          font,
          color: rgb(0, 0.5, 0),
        });
        yPosition -= lineHeight;
      }

      yPosition -= lineHeight * 0.5;
    }

    // Footer
    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const currentPage = pdfDoc.getPages()[i];
      currentPage.drawText(`Inspector Twin Report - Page ${i + 1} of ${pageCount}`, {
        x: margin,
        y: 30,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      currentPage.drawText(
        'Inspector Twin is for authorized simulation and testing only.',
        {
          x: margin,
          y: 15,
          size: 7,
          font,
          color: rgb(0.5, 0.5, 0.5),
        }
      );
    }

    const pdfBytes = await pdfDoc.save();
    writeFileSync(options.outputPath, pdfBytes);

    return options.outputPath;
  }
}
