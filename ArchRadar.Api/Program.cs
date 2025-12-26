using System.Reflection;
using ArchRadar.Api.Models;
using ArchRadar.Api.Services;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var workspaceRoot = Environment.GetEnvironmentVariable("ARCHRADAR_WORKSPACE");
if (string.IsNullOrWhiteSpace(workspaceRoot))
{
    var baseRoot = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
    workspaceRoot = Path.Combine(baseRoot, "ArchRadar");
}

Directory.CreateDirectory(workspaceRoot);
var paths = new WorkspacePaths(workspaceRoot);
builder.Services.AddSingleton(paths);
builder.Services.AddSingleton<ProjectCatalogService>();
builder.Services.AddSingleton<SnapshotService>();
builder.Services.AddSingleton<ScanService>();
builder.Services.AddSingleton<EditorLauncher>();

var app = builder.Build();
app.UseCors();

var uiRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "frontend-ui", "dist"));
if (Directory.Exists(uiRoot))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new PhysicalFileProvider(uiRoot)
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(uiRoot)
    });
    app.MapFallbackToFile("index.html", new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(uiRoot)
    });
}

app.MapGet("/api/health", () =>
{
    var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "dev";
    return Results.Ok(new HealthResponse(true, version));
});

app.MapGet("/api/projects", (ProjectCatalogService catalogService) =>
{
    var catalog = catalogService.LoadCatalog();
    var projects = catalog.Projects
        .OrderBy(project => project.Name, StringComparer.OrdinalIgnoreCase)
        .ToList();
    return Results.Ok(projects);
});

app.MapPost("/api/projects", (CreateProjectRequest request, ProjectCatalogService catalogService) =>
{
    if (string.IsNullOrWhiteSpace(request.ProjectRoot) || !Directory.Exists(request.ProjectRoot))
    {
        return Results.BadRequest("ProjectRoot is required and must exist.");
    }

    if (string.IsNullOrWhiteSpace(request.Name) && string.IsNullOrWhiteSpace(request.ProjectId))
    {
        return Results.BadRequest("ProjectId or Name must be provided.");
    }

    var profile = catalogService.UpsertProject(request);
    return Results.Ok(new ProjectSummary(profile.ProjectId, profile.Name));
});

app.MapGet("/api/projects/{projectId}/snapshots", (string projectId, SnapshotService snapshotService, ProjectCatalogService catalogService) =>
{
    var profile = catalogService.GetProfile(projectId);
    if (profile == null)
    {
        return Results.NotFound();
    }

    var snapshots = snapshotService.ListSnapshots(projectId);
    return Results.Ok(snapshots);
});

app.MapGet("/api/projects/{projectId}/snapshots/{snapshotId}/layers", (string projectId, string snapshotId, SnapshotService snapshotService, ProjectCatalogService catalogService) =>
{
    var profile = catalogService.GetProfile(projectId);
    if (profile == null)
    {
        return Results.NotFound();
    }

    var index = snapshotService.GetSnapshotIndex(projectId, snapshotId);
    if (index == null)
    {
        return Results.NotFound();
    }

    return Results.Ok(new LayerResponse(index.Layers.Select(layer => layer.LayerId).ToList()));
});

app.MapGet("/api/projects/{projectId}/snapshots/{snapshotId}/diagram", (string projectId, string snapshotId, string? layer, SnapshotService snapshotService, ProjectCatalogService catalogService) =>
{
    if (string.IsNullOrWhiteSpace(layer))
    {
        return Results.BadRequest("layer is required.");
    }

    var profile = catalogService.GetProfile(projectId);
    if (profile == null)
    {
        return Results.NotFound();
    }

    var content = snapshotService.ReadLayerDiagram(projectId, snapshotId, layer);
    if (content == null)
    {
        return Results.NotFound();
    }

    return Results.Ok(new DiagramResponse(content));
});

app.MapGet("/api/projects/{projectId}/snapshots/{snapshotId}/audit", (string projectId, string snapshotId, SnapshotService snapshotService, ProjectCatalogService catalogService) =>
{
    var profile = catalogService.GetProfile(projectId);
    if (profile == null)
    {
        return Results.NotFound();
    }

    var audit = snapshotService.ReadAudit(projectId, snapshotId);
    if (audit == null)
    {
        return Results.NotFound();
    }

    return Results.Ok(audit);
});

app.MapPost("/api/projects/{projectId}/scan", async (string projectId, ScanRequest? request, ProjectCatalogService catalogService, ScanService scanService) =>
{
    var profile = catalogService.GetProfile(projectId);
    if (profile == null)
    {
        return Results.NotFound();
    }

    var result = await scanService.RunScanAsync(profile, request?.Notes);
    return Results.Ok(new SnapshotSummary(result.SnapshotId, result.Timestamp, result.Notes));
});

app.MapPost("/api/open", (OpenRequest request, EditorLauncher launcher) =>
{
    var result = launcher.OpenFile(request.File, request.Line, request.Col);
    return Results.Ok(new OpenResponse(result.Ok, result.Message));
});

app.Run();
