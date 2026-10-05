@echo off
npx --yes netlify-cli api updateSite --data "{\"site_id\":\"90df3866-2cb7-4fa4-a908-eb2ad8174cb9\",\"build_settings\":{\"cmd\":\"npm run build\",\"dir\":\"/\",\"stop_builds\":false}}"
