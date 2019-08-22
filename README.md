# Labeler

Update and assign labels by PR review.

## Create a config file in the root of your project
```yml
onComment:
  set:
    - help wanted
    - WIP

onApproved:
  remove:
    - help wanted
  set:
    - First review
    - Ready to merge

onChangesRequested:
  remove:
    - bug
    - invalid
    - duplicate
    - help wanted
  set:
    - Ready to merge
```

## Create a workflow:
```yml
name: Labeler

on: [pull_request_review, pull_request_review_comment]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@master
    - name: Labeler
      uses: estrada9166/labeler@v1
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        CONFIG_PATH: labeler-config.yml
```
